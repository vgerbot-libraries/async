import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";

export interface UniqOptions<I = unknown> extends CancellableOptions<I[]> {
	concurrency?: number;
}

/**
 * Removes duplicate items from an array using strict equality (===).
 * Preserves the first occurrence of each unique item.
 *
 * @template I - The input item type.
 * @param data - Input array.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle resolving to an array of unique items.
 *
 * @example
 * ```ts
 * const handle = uniq([1, 2, 2, 3, 1, 4]);
 * const result = await handle; // [1, 2, 3, 4]
 * ```
 */
export function uniq<I>(
	data: I[],
	options?: CancellableOptions<I[]>,
): CancellableHandle<I[]> {
	return cancellable(async (token) => {
		token.throwIfCancelled();
		const seen = new Set<I>();
		const result: I[] = [];

		for (const item of data) {
			token.throwIfCancelled();
			if (!seen.has(item)) {
				seen.add(item);
				result.push(item);
			}
		}

		return result;
	}, options);
}

/**
 * Removes duplicate items from an array based on a key selector function.
 * Preserves the first occurrence of each unique key.
 *
 * @template I - The input item type.
 * @template K - The key type.
 * @param data - Input array.
 * @param keySelector - Async function that extracts a unique key from each item.
 * @param options - Configuration options including concurrency limit.
 * @returns A cancellable handle resolving to an array of unique items.
 *
 * @example
 * ```ts
 * const users = [
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 *   { id: 1, name: 'Alice Duplicate' },
 * ];
 * const handle = uniqBy(users, async (user) => user.id);
 * const result = await handle; // [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
 * ```
 */
export function uniqBy<I, K>(
	data: I[],
	keySelector: (item: I, token: CancellableToken) => Promise<K>,
	options?: UniqOptions<I>,
): CancellableHandle<I[]> {
	const { concurrency = Infinity } = options ?? {};

	return cancellable(async (token) => {
		if (data.length === 0) {
			return [];
		}

		let keys: K[];
		if (isFinite(concurrency)) {
			keys = await runWithConcurrency(data, concurrency, (item) =>
				keySelector(item, token),
			);
		} else {
			keys = await Promise.all(data.map((item) => keySelector(item, token)));
		}

		const seen = new Set<K>();
		const result: I[] = [];

		for (let i = 0; i < data.length; i++) {
			token.throwIfCancelled();
			const key = keys[i]!;
			if (!seen.has(key)) {
				seen.add(key);
				result.push(data[i]!);
			}
		}

		return result;
	}, options);
}
