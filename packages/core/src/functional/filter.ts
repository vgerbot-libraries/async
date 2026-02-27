import {
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../common/concurrency";

export interface FilterOptions extends CancellableOptions {
	concurrency?: number;
}

/**
 * Filters an array of data asynchronously using a predicate function.
 * Allows controlling the maximum concurrency of the predicate execution.
 *
 * @template D - The type of the array data.
 * @param data - The array of data to filter, or a promise that resolves to one.
 * @param predicate - An async function applied to each item to determine if it should be kept.
 * @param options - Configuration options, including cancellation token and concurrency limit.
 * @returns A cancellable handle that resolves to an array of the items that passed the predicate.
 */
export function filter<D extends unknown[]>(
	data: D | Promise<D>,
	predicate: (item: D[number], token: CancellableToken) => Promise<boolean>,
	options?: FilterOptions,
) {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		const resolvedData = await data;
		if (isFinite(concurrency)) {
			const result: D = [] as unknown[] as D;
			await runWithConcurrency(resolvedData, concurrency, async (item) => {
				const keep = await predicate(item, token);
				if (keep) {
					result.push(item);
				}
			});
			return result;
		} else {
			const flags = await Promise.all(
				resolvedData.map((item) => predicate(item, token)),
			);
			return resolvedData.filter((_, index) => flags[index]) as D;
		}
	}, options);
}
