import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface SortByOptions<I = unknown> extends CancellableOptions<I[]> {
	concurrency?: number;
}

/**
 * Sorts a collection by computing a sort key for each element using an async function.
 * Elements are sorted in ascending order based on their computed keys.
 *
 * @template I - The type of the input items.
 * @template K - The type of the sort key (must be comparable).
 * @param data - The collection to sort.
 * @param iteratee - An async function that computes the sort key for each element.
 * @param options - Configuration options, including concurrency limit.
 * @returns A cancellable handle that resolves to the sorted array.
 *
 * @example
 * ```ts
 * const users = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 }
 * ];
 *
 * const handle = sortBy(
 *   users,
 *   async (user, token) => {
 *     await token.sleep(10);
 *     return user.age;
 *   },
 * );
 *
 * const result = await handle;
 * // [{ name: 'Bob', age: 25 }, { name: 'Alice', age: 30 }, { name: 'Charlie', age: 35 }]
 * ```
 *
 * @example
 * ```ts
 * const handle = sortBy(
 *   { a: 3, b: 1, c: 2 },
 *   async (value) => value,
 * );
 *
 * const result = await handle; // [1, 2, 3]
 * ```
 */
export function sortBy<I, K extends string | number>(
	data: I[] | Promise<I[]>,
	iteratee: (item: I, token: CancellableToken) => Promise<K>,
	options?: SortByOptions<I>,
): CancellableHandle<I[]>;
export function sortBy<I, K extends string | number>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iteratee: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<K>,
	options?: SortByOptions<I>,
): CancellableHandle<I[]>;
export function sortBy<I, K extends string | number>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iteratee:
		| ((item: I, token: CancellableToken) => Promise<K>)
		| ((item: I, key: number | string, token: CancellableToken) => Promise<K>),
	options?: SortByOptions<I>,
) {
	const { concurrency = Infinity } = options ?? {};

	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const entries = normalized.entries;
		const arrayIteratee = iteratee as unknown as (
			item: I,
			token: CancellableToken,
		) => Promise<K>;
		const objectIteratee = iteratee as unknown as (
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<K>;
		const invoke = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayIteratee(item, token);
			}
			return objectIteratee(item, key, token);
		};

		let sortKeys: K[];
		if (isFinite(concurrency)) {
			sortKeys = await runWithConcurrency(entries, concurrency, (entry) => {
				return invoke(entry.value, entry.key);
			});
		} else {
			sortKeys = await Promise.all(
				entries.map((entry) => invoke(entry.value, entry.key)),
			);
		}

		// Create array of [item, sortKey] pairs and sort by sortKey
		const paired = entries.map((entry, index) => ({
			item: entry.value,
			sortKey: sortKeys[index],
		}));

		paired.sort((a, b) => {
			if (a.sortKey < b.sortKey) return -1;
			if (a.sortKey > b.sortKey) return 1;
			return 0;
		});

		return paired.map((p) => p.item);
	}, options);
}
