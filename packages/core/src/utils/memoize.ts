import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";

export interface MemoizeOptions extends CancellableOptions {
	/**
	 * Custom function to generate cache keys from arguments.
	 * Defaults to using the first argument as the key.
	 */
	resolver?: (...args: unknown[]) => string;
}

/**
 * Creates a memoized version of an async function that caches results.
 * Subsequent calls with the same arguments return the cached result instead of re-executing.
 *
 * @template TArgs - The argument types of the function.
 * @template TResult - The return type of the function.
 * @param fn - The async function to memoize.
 * @param options - Configuration options including custom resolver.
 * @returns A memoized version of the function with a cache property.
 *
 * @example
 * ```ts
 * const expensiveOperation = memoize(
 *   async (id: number, token: CancellableToken) => {
 *     await token.sleep(1000);
 *     return fetchUserData(id);
 *   }
 * );
 *
 * const handle1 = expensiveOperation(1); // Takes 1 second
 * const handle2 = expensiveOperation(1); // Returns cached result immediately
 *
 * // Clear cache
 * expensiveOperation.cache.clear();
 * ```
 *
 * @example
 * ```ts
 * // Custom resolver for multiple arguments
 * const memoized = memoize(
 *   async (a: number, b: string) => `${a}-${b}`,
 *   {
 *     resolver: (a, b) => `${a}:${b}`,
 *   }
 * );
 * ```
 */
export function memoize<TArgs extends unknown[], TResult>(
	fn: (...args: [...TArgs, CancellableToken]) => Promise<TResult>,
	options?: MemoizeOptions,
): ((...args: TArgs) => CancellableHandle<TResult>) & {
	cache: Map<string, TResult>;
} {
	const cache = new Map<string, TResult>();
	const { resolver, ...cancellableOptions } = options ?? {};

	const defaultResolver = (...args: unknown[]) => {
		return args.length > 0 ? String(args[0]) : "";
	};

	const getKey = resolver ?? defaultResolver;

	const memoized = (...args: TArgs): CancellableHandle<TResult> => {
		const key = getKey(...args);

		if (cache.has(key)) {
			const cachedValue = cache.get(key) as TResult;
			return cancellable(async () => cachedValue, cancellableOptions);
		}

		return cancellable(async (token) => {
			const result = await fn(...args, token);
			cache.set(key, result);
			return result;
		}, cancellableOptions);
	};

	memoized.cache = cache;

	return memoized;
}
