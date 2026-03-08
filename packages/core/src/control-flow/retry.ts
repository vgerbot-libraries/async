import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
	RetryOptions,
} from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Wraps an async task with retry logic. The task will be retried according to
 * the specified retry options if it fails.
 *
 * @template T - The type of the task result
 * @param task - The async task to execute
 * @param retryOptions - Retry configuration (maxAttempts, delay, backOff, retryIf)
 * @param options - Additional cancellable configuration options
 * @returns A cancellable handle that resolves to the task result
 *
 * @example
 * ```ts
 * const handle = retry(
 *   async (token) => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 3,
 *     delay: 1000,
 *     backOff: 'exponential',
 *   },
 * );
 *
 * const data = await handle;
 * ```
 */
export function retry<T>(
	task: AsyncTask<T>,
	retryOptions: RetryOptions,
	options?: CancellableOptions<T>,
): CancellableHandle<T> {
	return cancellable(task, { ...options, retry: retryOptions });
}
