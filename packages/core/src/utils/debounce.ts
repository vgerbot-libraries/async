import { CancellableToken } from "../cancellable";
import {
	DebounceOptions,
	DebounceTaskExecutor,
} from "../executors/DebounceTaskExecutor";

/**
 * A debounced function that can be cancelled or flushed.
 */
export interface DebouncedFunction<T, Args extends unknown[] = unknown[]> {
	(...args: Args): Promise<T>;
	cancel(): void;
	flush(): void;
	pending(): boolean;
}

/**
 * Creates a debounced version of an async function. The function will only execute
 * after the specified wait time has elapsed since the last call.
 *
 * @template T - The return type of the function.
 * @param fn - The async function to debounce.
 * @param wait - Milliseconds to wait before executing.
 * @param options - Debounce configuration options.
 * @returns A debounced function with cancel, flush, and pending methods.
 *
 * @example
 * ```ts
 * const search = debounce(
 *   async (query: string) => {
 *     return await fetchResults(query);
 *   },
 *   300,
 * );
 *
 * search("hello"); // Waits 300ms
 * search("hello world"); // Cancels previous, waits 300ms
 *
 * // Cancel pending execution
 * search.cancel();
 *
 * // Execute immediately
 * search.flush();
 *
 * // Check if execution is pending
 * if (search.pending()) {
 *   console.log("Waiting...");
 * }
 * ```
 */
export function debounce<T, Args extends unknown[] = unknown[]>(
	fn: (...args: Args) => Promise<T>,
	wait: number,
	options?: DebounceOptions,
): DebouncedFunction<T, Args> {
	const executor = new DebounceTaskExecutor(wait, options);

	const debounced = (...args: Args): Promise<T> => {
		return executor.exec(async (token: CancellableToken) => {
			return fn(...args);
		}).promise as Promise<T>;
	};

	debounced.cancel = () => executor.cancel();
	debounced.flush = () => executor.flush();
	debounced.pending = () => executor.pending;

	return debounced;
}
