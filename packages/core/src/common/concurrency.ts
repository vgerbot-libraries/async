/**
 * Runs an asynchronous task on an array of items with a specified concurrency limit.
 * Uses a slot-filling approach: as soon as one task completes, the next item starts
 * processing, keeping all slots busy at all times.
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

	const results = new Array<R>(items.length);
	let nextIndex = 0;
	let firstError: unknown;
	let hasError = false;

	async function runWorker(): Promise<void> {
		while (nextIndex < items.length && !hasError) {
			const index = nextIndex++;
			try {
				results[index] = await processor(items[index]!, index);
			} catch (err) {
				if (!hasError) {
					hasError = true;
					firstError = err;
				}
			}
		}
	}

	const workerCount = Math.min(concurrency, items.length);
	await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

	if (hasError) {
		throw firstError;
	}

	return results;
}
