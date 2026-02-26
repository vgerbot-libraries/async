import { CancellableOptions, cancellable } from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Takes an array of tasks and returns a promise that resolves or rejects as soon as the first task settles.
 *
 * @param options - Cancellable configuration options.
 * @param args - The tasks to execute.
 * @returns A cancellable handle that resolves or rejects with the first settled task's result or error.
 */
export function race(
	options: CancellableOptions,
	...args: AsyncTask<unknown>[]
) {
	return cancellable(async (token) => {
		const promises = args.map(async (task) => {
			return task(token);
		});
		return Promise.race(promises);
	}, options);
}
