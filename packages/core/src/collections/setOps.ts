import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
} from "../cancellable";

/**
 * Returns elements in arr1 that are not in arr2.
 * Uses strict equality (===) for comparison.
 *
 * @template I - The element type.
 * @param arr1 - First array.
 * @param arr2 - Second array.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle resolving to the difference.
 *
 * @example
 * ```ts
 * const handle = difference([1, 2, 3, 4], [2, 4]);
 * const result = await handle; // [1, 3]
 * ```
 */
export function difference<I>(
	arr1: I[],
	arr2: I[],
	options?: CancellableOptions<I[]>,
): CancellableHandle<I[]> {
	return cancellable(async (token) => {
		token.throwIfCancelled();
		const set2 = new Set(arr2);
		const result: I[] = [];

		for (const item of arr1) {
			token.throwIfCancelled();
			if (!set2.has(item)) {
				result.push(item);
			}
		}

		return result;
	}, options);
}

/**
 * Returns elements that exist in both arr1 and arr2.
 * Uses strict equality (===) for comparison.
 *
 * @template I - The element type.
 * @param arr1 - First array.
 * @param arr2 - Second array.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle resolving to the intersection.
 *
 * @example
 * ```ts
 * const handle = intersection([1, 2, 3], [2, 3, 4]);
 * const result = await handle; // [2, 3]
 * ```
 */
export function intersection<I>(
	arr1: I[],
	arr2: I[],
	options?: CancellableOptions<I[]>,
): CancellableHandle<I[]> {
	return cancellable(async (token) => {
		token.throwIfCancelled();
		const set2 = new Set(arr2);
		const result: I[] = [];

		for (const item of arr1) {
			token.throwIfCancelled();
			if (set2.has(item)) {
				result.push(item);
			}
		}

		return result;
	}, options);
}

/**
 * Returns unique elements from both arr1 and arr2.
 * Uses strict equality (===) for comparison.
 *
 * @template I - The element type.
 * @param arr1 - First array.
 * @param arr2 - Second array.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle resolving to the union.
 *
 * @example
 * ```ts
 * const handle = union([1, 2, 3], [2, 3, 4]);
 * const result = await handle; // [1, 2, 3, 4]
 * ```
 */
export function union<I>(
	arr1: I[],
	arr2: I[],
	options?: CancellableOptions<I[]>,
): CancellableHandle<I[]> {
	return cancellable(async (token) => {
		token.throwIfCancelled();
		const seen = new Set<I>();
		const result: I[] = [];

		for (const item of arr1) {
			token.throwIfCancelled();
			if (!seen.has(item)) {
				seen.add(item);
				result.push(item);
			}
		}

		for (const item of arr2) {
			token.throwIfCancelled();
			if (!seen.has(item)) {
				seen.add(item);
				result.push(item);
			}
		}

		return result;
	}, options);
}
