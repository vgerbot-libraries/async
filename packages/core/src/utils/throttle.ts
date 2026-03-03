import { ThrottleTaskExecutor, ThrottleOptions } from "../executors/ThrottleTaskExecutor";
import { CancellableToken } from "../cancellable";

/**
 * A throttled function that can be cancelled or flushed.
 */
export interface ThrottledFunction<T> {
	(...args: any[]): Promise<T>;
	cancel(): void;
	flush(): void;
	pending(): boolean;
}

/**
 * Creates a throttled version of an async function. The function will execute at most
 * once per wait period, regardless of how many times it's called.
 *
 * @template T - The return type of the function.
 * @param fn - The async function to throttle.
 * @param wait - Minimum milliseconds between executions.
 * @param options - Throttle configuration options.
 * @returns A throttled function with cancel, flush, and pending methods.
 *
 * @example
 * ```ts
 * const saveData = throttle(
 *   async (data: string) => {
 *     return await api.save(data);
 *   },
 *   1000,
 * );
 *
 * saveData("a"); // Executes immediately
 * saveData("b"); // Queued, executes after 1000ms
 * saveData("c"); // Replaces "b", executes after 1000ms
 *
 * // Cancel pending execution
 * saveData.cancel();
 *
 * // Execute immediately
 * saveData.flush();
 * ```
 */
export function throttle<T>(
	fn: (...args: any[]) => Promise<T>,
	wait: number,
	options?: ThrottleOptions,
): ThrottledFunction<T> {
	const executor = new ThrottleTaskExecutor(wait, options);

	const throttled = (...args: any[]): Promise<T> => {
		return executor.exec(async (token: CancellableToken) => {
			return fn(...args);
		}).promise as Promise<T>;
	};

	throttled.cancel = () => executor.cancel();
	throttled.flush = () => executor.flush();
	throttled.pending = () => executor.pending;

	return throttled as ThrottledFunction<T>;
}
