import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
} from "../cancellable";

/**
 * Splits an array into chunks of the specified size.
 * The last chunk may contain fewer items if the array length is not evenly divisible.
 *
 * @template I - The input item type.
 * @param data - Input array to chunk.
 * @param size - The size of each chunk (must be positive).
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle resolving to an array of chunks.
 *
 * @example
 * ```ts
 * const handle = chunk([1, 2, 3, 4, 5], 2);
 * const result = await handle; // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<I>(
	data: I[],
	size: number,
	options?: CancellableOptions<I[][]>,
): CancellableHandle<I[][]> {
	return cancellable(async (token) => {
		if (size <= 0) {
			throw new Error("Chunk size must be positive");
		}
		token.throwIfCancelled();

		const chunks: I[][] = [];
		for (let i = 0; i < data.length; i += size) {
			token.throwIfCancelled();
			chunks.push(data.slice(i, i + size));
		}
		return chunks;
	}, options);
}
