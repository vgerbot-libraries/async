import { CancellableToken, cancellable } from "../cancellable";
import { runWithConcurrency } from "../common/concurrency";

export interface FilterOptions extends CancellableToken {
	concurrency?: number;
}

/**
 * Filters an array of data asynchronously using a predicate function.
 * Allows controlling the maximum concurrency of the predicate execution.
 *
 * @template D - The type of the array data.
 * @param data - The array of data to filter.
 * @param predicate - An async function applied to each item to determine if it should be kept.
 * @param options - Configuration options, including cancellation token and concurrency limit.
 * @returns A cancellable handle that resolves to an array of the items that passed the predicate.
 */
export function filter<D extends unknown[]>(
	data: D,
	predicate: (item: D[number], token: CancellableToken) => Promise<boolean>,
	options?: FilterOptions,
) {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		if (isFinite(concurrency)) {
			const result: D = [] as unknown[] as D;
			await runWithConcurrency(data, concurrency, async (item) => {
				const keep = await predicate(item, token);
				if (keep) {
					result.push(item);
				}
			});
			return result;
		} else {
			return data.filter(async (item) => {
				return await predicate(item, token);
			});
		}
	}, options);
}
