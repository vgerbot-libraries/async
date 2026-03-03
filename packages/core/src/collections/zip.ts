import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
} from "../cancellable";

/**
 * Combines multiple arrays element-wise into tuples.
 * The resulting array length equals the shortest input array.
 *
 * @template T - The element type.
 * @param arrays - Arrays to zip together.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle resolving to an array of tuples.
 *
 * @example
 * ```ts
 * const handle = zip([1, 2, 3], ['a', 'b', 'c']);
 * const result = await handle; // [[1, 'a'], [2, 'b'], [3, 'c']]
 * ```
 */
export function zip<T>(
	arrays: T[][],
	options?: CancellableOptions<T[][]>,
): CancellableHandle<T[][]> {
	return cancellable(async (token) => {
		if (arrays.length === 0) {
			return [];
		}
		token.throwIfCancelled();

		const minLength = Math.min(...arrays.map((arr) => arr.length));
		const result: T[][] = [];

		for (let i = 0; i < minLength; i++) {
			token.throwIfCancelled();
			result.push(arrays.map((arr) => arr[i]!));
		}

		return result;
	}, options);
}
