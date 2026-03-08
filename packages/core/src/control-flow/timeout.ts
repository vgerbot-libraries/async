import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
} from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Wraps an async task with a timeout. The task will be automatically cancelled
 * if it doesn't complete within the specified duration.
 *
 * @template T - The type of the task result
 * @param task - The async task to execute
 * @param ms - The timeout duration in milliseconds
 * @param options - Additional cancellable configuration options
 * @returns A cancellable handle that resolves to the task result or rejects on timeout
 *
 * @example
 * ```ts
 * const handle = timeout(
 *   async (token) => {
 *     await token.sleep(2000);
 *     return "done";
 *   },
 *   1000, // 1 second timeout
 * );
 *
 * await handle; // Throws timeout error after 1 second
 * ```
 */
export function timeout<T>(
	task: AsyncTask<T>,
	ms: number,
	options?: CancellableOptions<T>,
): CancellableHandle<T> {
	return cancellable(task, { ...options, timeout: ms });
}
