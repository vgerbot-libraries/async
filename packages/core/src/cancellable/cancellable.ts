import { AsyncTask } from "./AsyncTask";
import { CancelError } from "./CancelError";
import { CancellableHandle } from "./CancellableHandle";
import { CancellableToken } from "./CancellableToken";
import { CANCEL_REASON, RETRY_ATTEMPT } from "./internal";
import { CancellableOptions } from "./options";

/**
 * Creates a cancellable asynchronous task with optional retry logic.
 * Returns a CancellableHandle that can be used to cancel the task or await its result.
 *
 * @template T - The type of the task result
 * @param asyncTask - The async function to execute, receives a CancellableToken
 * @returns A CancellableHandle for managing the task
 *
 * @example
 * ```typescript
 * const handle = cancellable(async (token) => {
 *   await token.sleep(1000);
 *   await token.wrap(fetch('/api/xxx', { signal: token.signal }))
 *   await token.wrap(cancellable(async token => {
 *     await token.wrap(new Promise(resolve => {
 *        setTimeout(resolve, 1000);
 *     }))
 *   }))
 *   return "done";
 * });
 *
 * // Cancel the task
 * handle.cancel("User cancelled");
 * ```
 */
export function cancellable<T>(asyncTask: AsyncTask<T>): CancellableHandle<T>;

/**
 * Creates a cancellable asynchronous task with options.
 * Errors will be rejected unless `fallback` is provided.
 *
 * @template T - The type of the task result
 * @param asyncTask - The async function to execute, receives a CancellableToken
 * @param options - Configuration options including retry, timeout and fallback
 * @returns A CancellableHandle for managing the task
 */
export function cancellable<T>(
	asyncTask: (token: CancellableToken) => Promise<T>,
	options?: CancellableOptions<T>,
): CancellableHandle<T>;

/**
 * Core implementation of the cancellable task creator.
 *
 * @template T - The type of the task result
 * @param asyncTask - The async function to execute, receives a CancellableToken
 * @param options - Full configuration options including retry logic and fallback behavior
 * @returns A CancellableHandle that resolves to T
 */
export function cancellable<T>(
	asyncTask: (token: CancellableToken) => Promise<T>,
	options?: CancellableOptions<T>,
): CancellableHandle<T> {
	const { name, signal, fallback, retry, timeout } = options ?? {};
	const label = name?.trim() ? `[${name}]` : "[cancellable]";
	const isFallbackFactory = (
		value: CancellableOptions<T>["fallback"],
	): value is (error: unknown, isCancelled: boolean) => Promise<T> =>
		typeof value === "function";
	const abortController = new AbortController();

	if (signal) {
		signal.addEventListener("abort", () => {
			abortController.abort(signal.reason);
		});
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	if (timeout !== undefined && timeout > 0) {
		timeoutId = setTimeout(() => {
			abortController.abort(`${label} timeout after ${timeout}ms`);
		}, timeout);
	}

	const handle = new CancellableHandle<T>(abortController, name);

	const token = new CancellableToken(abortController.signal, name);

	token.onCancel((reason) => {
		handle[CANCEL_REASON] = reason;
	});

	async function executeWithRetry(): Promise<T> {
		const maxAttempts = retry?.maxAttempts ?? 1;
		const retryIf = retry?.retryIf ?? (() => true);
		const delay = retry?.delay ?? 0;
		const backOff = retry?.backOff;

		function calculateDelay(attempt: number, error: Error): number {
			if (typeof delay === "function") {
				return delay(attempt, error);
			}
			if (!backOff) {
				return delay;
			}
			switch (backOff) {
				case "linear":
					return delay * attempt;
				case "exponential":
					return delay * Math.pow(2, attempt);
			}
			return delay;
		}

		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			token.throwIfCancelled();
			token[RETRY_ATTEMPT] = attempt;
			try {
				return await asyncTask(token);
			} catch (error) {
				lastError = error as Error;
				if (error instanceof CancelError) {
					throw error;
				}
				const shouldRetry = attempt < maxAttempts && retryIf(error as Error);

				if (shouldRetry) {
					const waitMs = calculateDelay(attempt, error as Error);

					if (waitMs > 0) {
						await token.sleep(waitMs);
					}
				} else {
					if (lastError instanceof Error) {
						lastError.message = `${label} attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`;
					}
					throw lastError;
				}
			}
		}

		throw lastError ?? new Error("No attempts were made");
	}

	executeWithRetry().then(
		(value) => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			handle.resolve(value);
		},
		(reason) => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			if (fallback === undefined) {
				handle.reject(reason);
				return;
			}

			if (isFallbackFactory(fallback)) {
				fallback(reason, reason instanceof CancelError).then(
					(value: T) => handle.resolve(value),
					(error: unknown) => handle.reject(error),
				);
				return;
			}

			Promise.resolve(fallback).then(
				(value: T) => handle.resolve(value),
				(error: unknown) => handle.reject(error),
			);
		},
	);

	return handle;
}
