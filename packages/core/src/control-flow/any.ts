import { CancellableOptions, cancellable } from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Takes an array of tasks and returns a promise that resolves as soon as any of the tasks resolves.
 * If all tasks reject, it rejects with an AggregateError.
 *
 * @param options - Cancellable configuration options.
 * @param tasks - The tasks to execute.
 * @returns A cancellable handle that resolves with the first successful task's result.
 *
 * @example
 * ```ts
 * const handle = any(
 *   {},
 *   async () => {
 *     throw new Error("failed");
 *   },
 *   async (token) => {
 *     await token.sleep(10);
 *     return "ok";
 *   },
 * );
 *
 * const result = await handle; // "ok"
 * ```
 */
export function any(
	options: CancellableOptions,
	...tasks: AsyncTask<unknown>[]
) {
	return cancellable(async (token) => {
		const promises = tasks.map(async (task) => {
			return task(token);
		});
		return Promise.any(promises);
	}, options);
}
