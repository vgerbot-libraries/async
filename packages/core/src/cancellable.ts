import { Defer } from "./Defer";

/**
 * Error thrown when a cancellable task is cancelled.
 * Extends the standard Error class with an additional reason property.
 */
export class CancelError extends Error {
	/**
	 * Creates a new CancelError instance.
	 * @param message - The error message
	 * @param reason - The reason for cancellation
	 */
	constructor(
		message: string,
		public readonly reason: unknown,
	) {
		super(message);
		this.name = "CancelError";
	}
}

/**
 * Token provided to cancellable tasks for managing cancellation state and utilities.
 * Provides methods to check cancellation status, wrap promises, sleep, and run intervals.
 */
export class CancellableTaskToken {
	private cancelReason: CancelError | null = null;

	/**
	 * Creates a new CancellableTaskToken instance.
	 * @param signal - The AbortSignal to monitor for cancellation
	 */
	constructor(public readonly signal: AbortSignal) {
		signal.addEventListener("abort", () => {
			this.cancelReason = new CancelError("Task canceled", signal.reason);
		});
	}

	/**
	 * Wraps a promise or CancellableHandle to respect the cancellation token.
	 * If the token is cancelled, the wrapped promise will be rejected with a CancelError.
	 *
	 * @template T - The type of the promise result
	 * @param p - The promise or CancellableHandle to wrap
	 * @returns A promise that respects the cancellation token
	 */
	wrap<T>(p: CancellableHandle<T> | Promise<T>): Promise<T> {
		if (p instanceof CancellableHandle) {
			this.signal.addEventListener("abort", () => {
				p.cancel(this.cancelReason);
			});
			return p;
		}
		return new Promise<T>((resolve, reject) => {
			if (this.isCancelled()) {
				reject(this.cancelReason);
			}
			p.then((value) => {
				if (this.isCancelled()) {
					reject(this.cancelReason);
				} else {
					resolve(value);
				}
			}, reject);
		});
	}

	/**
	 * Creates a cancellable sleep/delay promise.
	 * The promise will be rejected if the token is cancelled during the sleep period.
	 *
	 * @param ms - The number of milliseconds to sleep
	 * @returns A promise that resolves after the specified delay or rejects if cancelled
	 */
	sleep(ms: number) {
		return new Promise<void>((resolve, reject) => {
			if (this.isCancelled()) {
				reject(this.cancelReason);
				return;
			}

			const timer = setTimeout(() => {
				if (this.isCancelled()) {
					reject(this.cancelReason);
				} else {
					resolve();
				}
			}, ms);

			this.signal.addEventListener("abort", () => {
				clearTimeout(timer);
				reject(this.cancelReason);
			});
		});
	}

	/**
	 * Executes a function repeatedly at a specified interval until the token is cancelled.
	 * The function can be synchronous or asynchronous.
	 *
	 * @param fn - The function to execute at each interval
	 * @param interval - The interval in milliseconds between executions
	 * @returns A promise that resolves when the token is cancelled
	 */
	async interval(fn: () => void | Promise<void>, interval: number) {
		while (!this.isCancelled()) {
			await fn();
			await this.sleep(interval);
		}
	}

	/**
	 * Throws a CancelError if the token has been cancelled.
	 * Useful for checking cancellation status at specific points in async operations.
	 *
	 * @throws {CancelError} If the token has been cancelled
	 */
	throwIfCancelled() {
		if (this.isCancelled()) {
			throw this.cancelReason;
		}
	}

	/**
	 * Checks if the token has been cancelled.
	 *
	 * @returns True if the token has been cancelled, false otherwise
	 */
	isCancelled() {
		return this.signal.aborted;
	}
}

/**
 * Handle for a cancellable task that extends Defer with cancellation capabilities.
 * Provides methods to cancel the task and check its cancellation status.
 *
 * @template T - The type of the task result
 */
export class CancellableHandle<T> extends Defer<T> {
	/**
	 * Creates a new CancellableHandle instance.
	 * @param abortController - The AbortController used to manage cancellation
	 */
	constructor(private readonly abortController: AbortController) {
		super();
	}

	/**
	 * Gets the AbortSignal associated with this handle.
	 * @returns The AbortSignal for monitoring cancellation
	 */
	get signal() {
		return this.abortController.signal;
	}

	/**
	 * Checks if the task has been cancelled.
	 * @returns True if the task has been cancelled, false otherwise
	 */
	isCancelled() {
		return this.signal.aborted;
	}

	/**
	 * Cancels the task with an optional reason.
	 * @param reason - Optional reason for cancellation
	 */
	cancel(reason?: unknown) {
		this.abortController.abort(reason);
	}
}

/**
 * Backoff strategy for retry delays.
 * - 'linear': Delay increases linearly with each attempt
 * - 'exponential': Delay increases exponentially with each attempt
 */
export type BackOff = "linear" | "exponential";

/**
 * Options for configuring retry behavior in cancellable tasks.
 */
export interface RetryOptions {
	/** Maximum number of attempts (including the initial attempt) */
	maxAttempts: number;
	/**
	 * Delay between retry attempts in milliseconds, or a function to calculate the delay.
	 * The function receives the attempt number, error, and optional backoff strategy.
	 */
	delay?:
		| number
		| ((attempt: number, error: Error, backOff?: BackOff) => number);
	/**
	 * Predicate function to determine if a retry should be attempted based on the error.
	 * Returns true to retry, false to fail immediately.
	 */
	retryIf?: (error: Error) => boolean;
	/** Backoff strategy for calculating retry delays */
	backOff?: BackOff;
}

/**
 * Options for configuring cancellable task behavior.
 */
export interface CancellableOptions {
	/** External AbortSignal to link with the task's cancellation */
	signal?: AbortSignal;
	/**
	 * If true, cancellation errors will be silently resolved instead of rejected.
	 * The promise will resolve with undefined when cancelled.
	 */
	silent?: boolean;
	/** Retry configuration for the task */
	retry?: RetryOptions;
}

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
 *   return "done";
 * });
 *
 * // Cancel the task
 * handle.cancel("User cancelled");
 * ```
 */
export function cancellable<T>(
	asyncTask: (token: CancellableTaskToken) => Promise<T>,
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
	asyncTask: (token: CancellableTaskToken) => Promise<T>,
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
	asyncTask: (token: CancellableTaskToken) => Promise<T>,
	options?: CancellableOptions & { silent: true },
): CancellableHandle<T | void>;

export function cancellable<T>(
	asyncTask: (token: CancellableTaskToken) => Promise<T>,
	options?: Omit<CancellableOptions, "silent">,
): CancellableHandle<T>;

export function cancellable<T>(
	asyncTask: (token: CancellableTaskToken) => Promise<T>,
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

	const token = new CancellableTaskToken(abortController.signal);

	async function executeWithRetry() {
		const maxAttempts = retry?.maxAttempts ?? 1;
		const retryIf = retry?.retryIf ?? (() => true);
		const delay = retry?.delay ?? 0;
		const backOff = retry?.backOff;
		const calculateDelay = typeof delay === "number" ? () => delay : delay;
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			token.throwIfCancelled();
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
