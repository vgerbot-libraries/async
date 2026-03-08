import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
} from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Repeatedly executes a task forever until cancelled.
 * This is an infinite loop that only stops via cancellation.
 *
 * @param task - The async task to execute repeatedly.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that never resolves (only rejects on cancellation).
 *
 * @example
 * ```ts
 * const handle = forever(async (token) => {
 *   await token.sleep(1000);
 *   console.log("tick");
 * });
 *
 * // Stop after 5 seconds
 * setTimeout(() => handle.cancel(), 5000);
 * ```
 */
export function forever(
	task: AsyncTask<void>,
	options?: CancellableOptions<never>,
): CancellableHandle<never> {
	return cancellable(async (token) => {
		while (true) {
			token.throwIfCancelled();
			await task(token);
		}
	}, options) as CancellableHandle<never>;
}
