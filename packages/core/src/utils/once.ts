import { AsyncTask } from "../cancellable/AsyncTask";
import { CancellableHandle, CancellableOptions, cancellable } from "../cancellable";

/**
 * Creates a function that executes only once. Subsequent calls return the cached result.
 * Similar to memoize but doesn't consider arguments - always returns the same result.
 *
 * @template T - The return type of the function.
 * @param fn - The async task to execute once.
 * @param options - Cancellable configuration options.
 * @returns A function that returns a cancellable handle, executing only on first call.
 *
 * @example
 * ```ts
 * let count = 0;
 * const initialize = once(async () => {
 *   count++;
 *   return "initialized";
 * });
 *
 * await initialize(); // count = 1, returns "initialized"
 * await initialize(); // count = 1, returns "initialized" (cached)
 * ```
 */
export function once<T>(
	fn: AsyncTask<T>,
	options?: CancellableOptions<T>,
): () => CancellableHandle<T> {
	let executed = false;
	let cachedResult: T;

	return () => {
		if (executed) {
			return cancellable(async () => cachedResult, options);
		}

		return cancellable(async (token) => {
			if (executed) {
				return cachedResult;
			}
			const result = await fn(token);
			executed = true;
			cachedResult = result;
			return result;
		}, options);
	};
}
