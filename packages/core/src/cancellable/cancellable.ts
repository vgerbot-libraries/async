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
 * @param asyncTask - The async function to execute, receives a CancellableTaskToken
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
export function cancellable<T>(
	asyncTask: (token: CancellableToken) => Promise<T>,
): CancellableHandle<T>;

/**
 * Creates a cancellable asynchronous task with options.
 * When silent is false, cancellation errors will be rejected normally.
 *
 * @template T - The type of the task result
 * @param asyncTask - The async function to execute, receives a CancellableTaskToken
 * @param options - Configuration options with silent set to false
 * @returns A CancellableHandle for managing the task
 */
export function cancellable<T>(
	asyncTask: (token: CancellableToken) => Promise<T>,
	options?: CancellableOptions & { silent: false },
): CancellableHandle<T>;

/**
 * Creates a cancellable asynchronous task with silent cancellation.
 * When silent is true, cancellation errors will resolve with undefined instead of rejecting.
 *
 * @template T - The type of the task result
 * @param asyncTask - The async function to execute, receives a CancellableTaskToken
 * @param options - Configuration options with silent set to true
 * @returns A CancellableHandle that resolves to T or void on cancellation
 */
export function cancellable<T>(
	asyncTask: (token: CancellableToken) => Promise<T>,
	options?: CancellableOptions & { silent: true },
): CancellableHandle<T | void>;

export function cancellable<T>(
	asyncTask: (token: CancellableToken) => Promise<T>,
	options?: Omit<CancellableOptions, "silent">,
): CancellableHandle<T>;

export function cancellable<T>(
	asyncTask: (token: CancellableToken) => Promise<T>,
	options?: CancellableOptions,
): CancellableHandle<T | void> {
	const { signal, silent, retry } = options ?? {};
	const abortController = new AbortController();

	if (signal) {
		signal.addEventListener("abort", () => {
			abortController.abort(signal.reason);
		});
	}

	const handle = new CancellableHandle<T | void>(abortController);

	const token = new CancellableToken(abortController.signal);

	token.onCancel((reason) => {
		handle[CANCEL_REASON] = reason;
	});

	async function executeWithRetry() {
		const maxAttempts = retry?.maxAttempts ?? 1;
		const retryIf = retry?.retryIf ?? (() => true);
		const delay = retry?.delay ?? 0;
		const backOff = retry?.backOff;
		const calculateDelay = typeof delay === "number" ? () => delay : delay;
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			token.throwIfCancelled();
			token[RETRY_ATTEMPT] = attempt;
			try {
				return asyncTask(token);
			} catch (error) {
				lastError = error as Error;
				if (error instanceof CancelError) {
					throw error;
				}
				const shouldRetry = attempt < maxAttempts && retryIf(error as Error);

				if (shouldRetry) {
					const delay = calculateDelay(attempt, error as Error, backOff);

					if (delay > 0) {
						await token.sleep(delay);
					}
				} else {
					throw lastError;
				}
			}
		}
	}

	executeWithRetry().then(handle.resolve, (reason) => {
		if (silent && reason instanceof CancelError) {
			handle.resolve(undefined as T);
		} else {
			handle.reject(reason);
		}
	});

	return handle;
}
