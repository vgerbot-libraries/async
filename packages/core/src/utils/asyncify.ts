import { CancellableHandle, CancellableOptions, cancellable } from "../cancellable";

/**
 * Wraps a synchronous function to return a cancellable promise.
 * Converts any function into an async operation.
 *
 * @template T - The return type of the function
 * @param fn - The synchronous function to wrap
 * @param options - Cancellable configuration options
 * @returns A function that returns a cancellable handle
 *
 * @example
 * ```ts
 * const syncFn = (x: number) => x * 2;
 * const asyncFn = asyncify(syncFn);
 * const result = await asyncFn(5); // 10
 * ```
 */
export function asyncify<T>(
	fn: (...args: any[]) => T,
	options?: CancellableOptions<T>,
): (...args: any[]) => CancellableHandle<T> {
	return (...args: any[]) => {
		return cancellable(async () => fn(...args), options);
	};
}
