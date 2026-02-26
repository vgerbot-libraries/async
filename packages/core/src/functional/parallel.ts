import { CancellableOptions, cancellable } from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";
import { runWithConcurrency } from "../common/concurrency";

export interface ParallelOptions extends CancellableOptions {
	concurrency?: number;
}

/**
 * Executes an array of tasks concurrently, with an optional concurrency limit.
 * Resolves with an array of results in the same order as the input tasks.
 * If any task rejects, the entire operation rejects.
 *
 * @param options - Configuration options, including cancellation token and concurrency limit.
 * @param tasks - The tasks to execute.
 * @returns A cancellable handle that resolves with the array of task results.
 */
export function parallel(
	options: ParallelOptions,
	...tasks: AsyncTask<unknown>[]
) {
	const { concurrency = Infinity } = options;
	return cancellable(async (token) => {
		if (isFinite(concurrency)) {
			return runWithConcurrency(tasks, concurrency, (task) => {
				return task(token);
			});
		} else {
			const promises = tasks.map(async (task) => {
				return task(token);
			});
			return Promise.all(promises);
		}
	}, options);
}

/**
 * Alias for `parallel`. Executes tasks concurrently and resolves when all succeed, or rejects when any fail.
 */
export const all = parallel;
