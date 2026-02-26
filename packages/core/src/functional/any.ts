import { CancellableOptions, cancellable } from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Takes an array of tasks and returns a promise that resolves as soon as any of the tasks resolves.
 * If all tasks reject, it rejects with an AggregateError.
 *
 * @param options - Cancellable configuration options.
 * @param tasks - The tasks to execute.
 * @returns A cancellable handle that resolves with the first successful task's result.
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

/**
 * Takes an array of tasks and returns a promise that resolves after all of the given tasks have either fulfilled or rejected,
 * with an array of objects that each describes the outcome of each task.
 *
 * @param options - Cancellable configuration options.
 * @param tasks - The tasks to execute.
 * @returns A cancellable handle that resolves with an array of outcome objects for each task.
 */
export function allSettled(
	options: CancellableOptions,
	...tasks: AsyncTask<unknown>[]
) {
	return cancellable(async (token) => {
		const promises = tasks.map(async (task) => {
			return task(token);
		});
		return Promise.allSettled(promises);
	}, options);
}
