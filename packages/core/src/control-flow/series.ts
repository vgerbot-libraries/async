import { CancellableHandle } from "../cancellable/CancellableHandle";
import { CancellableToken } from "../cancellable/CancellableToken";
import { cancellable } from "../cancellable/cancellable";
import { CancellableOptions } from "../cancellable/options";

/**
 * Represents a task that can be executed in a series.
 * Can be a Promise, a CancellableHandle, or a function that receives input and a cancellation token.
 *
 * @template TInput - The type of input the task receives from the previous task
 * @template TOutput - The type of output the task produces for the next task
 */
type SeriesTask<TInput = unknown, TOutput = unknown> =
	| Promise<TOutput>
	| CancellableHandle<TOutput>
	| ((
			input: TInput,
			token: CancellableToken,
	  ) => Promise<TOutput> | CancellableHandle<TOutput>);

/**
 * Executes a single task in series with cancellation support.
 *
 * @template T1 - The output type of the task
 * @param options - Cancellation options for the series execution
 * @param task1 - The task to execute
 * @returns A CancellableHandle that resolves to the task's output
 *
 * @example
 * ```ts
 * const handle = series(
 *   { signal: abortController.signal },
 *   async (input, token) => {
 *     await token.sleep(1000);
 *     return "result";
 *   }
 * );
 * ```
 */
export function series<T1>(
	options: CancellableOptions,
	task1: SeriesTask<void, T1>,
): CancellableHandle<T1>;

/**
 * Executes two tasks in series, passing the output of the first task as input to the second.
 *
 * @template T1 - The output type of the first task
 * @template T2 - The output type of the second task
 * @param options - Cancellation options for the series execution
 * @param task1 - The first task to execute
 * @param task2 - The second task to execute, receives T1 as input
 * @returns A CancellableHandle that resolves to the second task's output
 *
 * @example
 * ```ts
 * const handle = series(
 *   { signal: abortController.signal },
 *   async () => 42,
 *   async (num, token) => `Result: ${num}`
 * );
 * ```
 */
export function series<T1, T2>(
	options: CancellableOptions,
	task1: SeriesTask<void, T1>,
	task2: SeriesTask<T1, T2>,
): CancellableHandle<T2>;

/**
 * Executes three tasks in series, chaining their outputs as inputs to subsequent tasks.
 *
 * @template T1 - The output type of the first task
 * @template T2 - The output type of the second task
 * @template T3 - The output type of the third task
 * @param options - Cancellation options for the series execution
 * @param task1 - The first task to execute
 * @param task2 - The second task to execute, receives T1 as input
 * @param task3 - The third task to execute, receives T2 as input
 * @returns A CancellableHandle that resolves to the third task's output
 *
 * @example
 * ```ts
 * const handle = series(
 *   { signal: abortController.signal },
 *   async () => 1,
 *   async (n) => n + 1,
 *   async (n) => n * 2
 * );
 * // Result: 4
 * ```
 */
export function series<T1, T2, T3>(
	options: CancellableOptions,
	task1: SeriesTask<void, T1>,
	task2: SeriesTask<T1, T2>,
	task3: SeriesTask<T2, T3>,
): CancellableHandle<T3>;

/**
 * Executes four tasks in series, chaining their outputs as inputs to subsequent tasks.
 *
 * @template T1 - The output type of the first task
 * @template T2 - The output type of the second task
 * @template T3 - The output type of the third task
 * @template T4 - The output type of the fourth task
 * @param options - Cancellation options for the series execution
 * @param task1 - The first task to execute
 * @param task2 - The second task to execute, receives T1 as input
 * @param task3 - The third task to execute, receives T2 as input
 * @param task4 - The fourth task to execute, receives T3 as input
 * @returns A CancellableHandle that resolves to the fourth task's output
 *
 * @example
 * ```ts
 * const handle = series(
 *   { signal: abortController.signal },
 *   async () => "hello",
 *   async (str) => str.toUpperCase(),
 *   async (str) => str + " WORLD",
 *   async (str) => str.length
 * );
 * // Result: 11
 * ```
 */
export function series<T1, T2, T3, T4>(
	options: CancellableOptions,
	task1: SeriesTask<void, T1>,
	task2: SeriesTask<T1, T2>,
	task3: SeriesTask<T2, T3>,
	task4: SeriesTask<T3, T4>,
): CancellableHandle<T4>;

/**
 * Executes multiple tasks in series, chaining their outputs as inputs to subsequent tasks.
 * Each task receives the output of the previous task as input and a cancellation token.
 * If any task is cancelled or throws an error, the entire series is aborted.
 *
 * Tasks can be:
 * - Functions that receive input and a cancellation token
 * - Promises that resolve to a value
 * - CancellableHandle instances
 *
 * The series execution respects cancellation through the provided options and will:
 * - Check for cancellation after each task completes
 * - Propagate cancellation to CancellableHandle tasks
 * - Throw CancelError if cancelled during execution
 *
 * @param options - Cancellation options including signal, retry configuration, and timeout
 * @param task1 - The first task to execute (receives void as input)
 * @param args - Additional tasks to execute in sequence
 * @returns A CancellableHandle that resolves to the last task's output
 *
 * @throws {CancelError} If the series is cancelled during execution
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * const handle = series(
 *   { signal: controller.signal },
 *   async (_, token) => fetch('/api/user', { signal: token.signal }),
 *   async (response, token) => {
 *     await token.sleep(100);
 *     return response.json();
 *   },
 *   async (data) => processData(data)
 * );
 *
 * // Cancel the series
 * controller.abort();
 * ```
 *
 * @see {@link CancellableHandle} for managing the returned handle
 * @see {@link CancellableOptions} for available options
 * @see {@link CancellableToken} for token utilities
 */
export function series(
	options: CancellableOptions,
	task1: SeriesTask<void, unknown>,
	...args: SeriesTask<unknown, unknown>[]
): CancellableHandle<unknown> {
	const tasks = [task1, ...args];
	return cancellable(async (token) => {
		let previousResult: unknown;
		for (const task of tasks) {
			if (typeof task === "function") {
				previousResult = await task(previousResult as void & unknown, token);
			} else if (task instanceof CancellableHandle) {
				if (task.isCancelled()) {
					throw task.cancelReason;
				}
				previousResult = await task.promise;
			} else {
				previousResult = await task;
			}
			token.throwIfCancelled();
		}
		return previousResult;
	}, options);
}
