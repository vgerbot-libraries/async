/**
 * Runs an asynchronous task on an array of items with a specified concurrency limit.
 * Processes the items in batches/chunks, waiting for each batch to complete before
 * moving to the next.
 *
 * @template T - The type of items in the input array.
 * @template R - The type of the result array items.
 * @param items - The array of items to process.
 * @param concurrency - The maximum number of concurrent tasks. If not finite or <= 0, processes all concurrently.
 * @param processor - The async function to execute for each item.
 * @returns A promise that resolves to an array of results in the same order as the input items.
 */
export async function runWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	processor: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	if (!isFinite(concurrency) || concurrency <= 0) {
		return Promise.all(items.map(processor));
	}

	const results: R[] = [];
	const groups = Math.ceil(items.length / concurrency);

	for (let i = 0; i < groups; i++) {
		const startIndex = i * concurrency;
		const groupItems = items.slice(startIndex, startIndex + concurrency);
		const groupResults = await Promise.all(
			groupItems.map((item, index) => processor(item, startIndex + index)),
		);
		results.push(...groupResults);
	}

	return results;
}
