import { CancellableHandle } from "../cancellable/CancellableHandle";
import { CancellableToken } from "../cancellable/CancellableToken";
import { cancellable } from "../cancellable/cancellable";
import { CancellableOptions } from "../cancellable/options";

/**
 * Represents a task in a waterfall that receives the previous result.
 */
type WaterfallTask<TInput = unknown, TOutput = unknown> = (
	input: TInput,
	token: CancellableToken,
) => Promise<TOutput> | CancellableHandle<TOutput>;

/**
 * Executes a single task in waterfall with cancellation support.
 */
export function waterfall<T1>(
	task1: WaterfallTask<unknown, T1>,
): CancellableHandle<T1>;
export function waterfall<T1>(
	task1: WaterfallTask<unknown, T1>,
	options: CancellableOptions,
): CancellableHandle<T1>;

/**
 * Executes two tasks in waterfall, passing the output of the first as input to the second.
 */
export function waterfall<T1, T2>(
	task1: WaterfallTask<unknown, T1>,
	task2: WaterfallTask<T1, T2>,
): CancellableHandle<T2>;
export function waterfall<T1, T2>(
	task1: WaterfallTask<unknown, T1>,
	task2: WaterfallTask<T1, T2>,
	options: CancellableOptions,
): CancellableHandle<T2>;

/**
 * Executes three tasks in waterfall, chaining their outputs.
 */
export function waterfall<T1, T2, T3>(
	task1: WaterfallTask<unknown, T1>,
	task2: WaterfallTask<T1, T2>,
	task3: WaterfallTask<T2, T3>,
): CancellableHandle<T3>;
export function waterfall<T1, T2, T3>(
	task1: WaterfallTask<unknown, T1>,
	task2: WaterfallTask<T1, T2>,
	task3: WaterfallTask<T2, T3>,
	options: CancellableOptions,
): CancellableHandle<T3>;

/**
 * Executes four tasks in waterfall, chaining their outputs.
 */
export function waterfall<T1, T2, T3, T4>(
	task1: WaterfallTask<unknown, T1>,
	task2: WaterfallTask<T1, T2>,
	task3: WaterfallTask<T2, T3>,
	task4: WaterfallTask<T3, T4>,
): CancellableHandle<T4>;
export function waterfall<T1, T2, T3, T4>(
	task1: WaterfallTask<unknown, T1>,
	task2: WaterfallTask<T1, T2>,
	task3: WaterfallTask<T2, T3>,
	task4: WaterfallTask<T3, T4>,
	options: CancellableOptions,
): CancellableHandle<T4>;

/**
 * Runs tasks in series, passing each result to the next task as input.
 * Similar to series but with a clearer semantic focus on data flow through a pipeline.
 *
 * Each task receives:
 * - The output of the previous task as its first argument
 * - A cancellation token as its second argument
 *
 * @param task1 - The first task to execute (receives void as input)
 * @param args - Additional tasks and optional options
 * @returns A cancellable handle that resolves to the last task's output
 *
 * @example
 * ```ts
 * const handle = waterfall(
 *   async (_, token) => {
 *     await token.sleep(10);
 *     return 5;
 *   },
 *   async (num, token) => {
 *     await token.sleep(10);
 *     return num * 2;
 *   },
 *   async (num, token) => {
 *     await token.sleep(10);
 *     return `Result: ${num}`;
 *   },
 * );
 *
 * const result = await handle; // "Result: 10"
 * ```
 *
 * @example
 * ```ts
 * const handle = waterfall(
 *   async () => fetch('/api/user'),
 *   async (response) => response.json(),
 *   async (data) => processUserData(data),
 * );
 * ```
 */
export function waterfall(
	task1: WaterfallTask<unknown, unknown>,
	...args: (WaterfallTask<unknown, unknown> | CancellableOptions)[]
): CancellableHandle<unknown> {
	// Extract options if last argument is an options object
	let options: CancellableOptions | undefined;
	let tasks: WaterfallTask<unknown, unknown>[];

	const lastArg = args[args.length - 1];
	if (
		lastArg &&
		typeof lastArg === "object" &&
		!("length" in lastArg) &&
		typeof lastArg !== "function"
	) {
		options = lastArg as CancellableOptions;
		tasks = [
			task1,
			...(args.slice(0, -1) as WaterfallTask<unknown, unknown>[]),
		];
	} else {
		tasks = [task1, ...(args as WaterfallTask<unknown, unknown>[])];
	}

	const resolvedOptions: CancellableOptions = {
		...options,
		name: options?.name ?? "waterfall",
	};

	return cancellable(async (token) => {
		let result: unknown = undefined;
		for (const task of tasks) {
			result = await task(result, token);
			token.throwIfCancelled();
		}
		return result;
	}, resolvedOptions);
}
