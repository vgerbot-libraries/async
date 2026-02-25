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
		| ((attempt: number, error: Error, backOff?: string) => number);
	/**
	 * Predicate function to determine if a retry should be attempted based on the error.
	 * Returns true to retry, false to fail immediately.
	 */
	retryIf?: (error: Error) => boolean;
	/** Backoff strategy for calculating retry delays */
	backOff?: string;
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
