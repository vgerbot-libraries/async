/**
 * Built-in backoff strategies for retry delays.
 * - `'linear'`: delay increases linearly with each attempt (baseDelay * attempt)
 * - `'exponential'`: delay doubles with each attempt (baseDelay * 2^attempt)
 */
export type BackOffStrategy = "linear" | "exponential";

/**
 * Options for configuring retry behavior in cancellable tasks.
 */
export interface RetryOptions {
	/** Maximum number of attempts (including the initial attempt) */
	maxAttempts: number;
	/**
	 * Delay between retry attempts in milliseconds, or a function to calculate the delay.
	 * When used with a `backOff` strategy and a numeric value, this serves as the base delay.
	 */
	delay?: number | ((attempt: number, error: Error) => number);
	/**
	 * Predicate function to determine if a retry should be attempted based on the error.
	 * Returns true to retry, false to fail immediately.
	 */
	retryIf?: (error: Error) => boolean;
	/**
	 * Built-in backoff strategy applied to numeric delays.
	 * Has no effect when `delay` is a custom function.
	 */
	backOff?: BackOffStrategy;
}

/**
 * Options for configuring cancellable task behavior.
 */
export interface CancellableOptions<T = unknown> {
	/** External AbortSignal to link with the task's cancellation */
	signal?: AbortSignal;
	/**
	 * Fallback value/provider used when the task rejects.
	 * Receives the original error and whether it was caused by cancellation.
	 */
	fallback?:
		| T
		| Promise<T>
		| ((error: unknown, isCancelled: boolean) => Promise<T>);
	/** Retry configuration for the task */
	retry?: RetryOptions;
	/**
	 * Timeout in milliseconds. The task will be automatically cancelled
	 * after this duration with a "Timeout" cancel reason.
	 */
	timeout?: number;
}
