import {
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";

export interface TimesOptions<R = unknown> extends CancellableOptions<R[]> {
	concurrency?: number;
}

/**
 * Repeats an async iterator `count` times and collects results in index order.
 *
 * @template R - Iterator return type.
 * @param count - Number of iterations to run. Values <= 0 return an empty array.
 * @param iterator - Async iterator receiving the current index and cancellation token.
 * @param options - Configuration options, including cancellation and concurrency.
 * @returns A cancellable handle that resolves to collected results.
 *
 * @example
 * ```ts
 * const handle = times(
 *   4,
 *   async (index, token) => {
 *     await token.sleep(10);
 *     return index * index;
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle; // [0, 1, 4, 9]
 * ```
 */
export function times<R>(
	count: number,
	iterator: (index: number, token: CancellableToken) => Promise<R>,
	options?: TimesOptions<R>,
) {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		const safeCount = Math.max(0, Math.floor(count));
		const indexes = Array.from({ length: safeCount }, (_, index) => index);
		if (isFinite(concurrency)) {
			return runWithConcurrency(indexes, concurrency, (index) => {
				return iterator(index, token);
			});
		}
		return Promise.all(indexes.map((index) => iterator(index, token)));
	}, options);
}
