import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface ConcatOptions<R = unknown> extends CancellableOptions<R[]> {
	concurrency?: number;
}

/**
 * Maps over a collection and flattens the results into a single array.
 * Each iterator should return an array, and all arrays are concatenated together.
 *
 * @template I - The type of the input items.
 * @template R - The type of the elements in the returned arrays.
 * @param data - The collection to iterate over.
 * @param iteratee - An async function that returns an array for each element.
 * @param options - Configuration options, including concurrency limit.
 * @returns A cancellable handle that resolves to a flattened array of all results.
 *
 * @example
 * ```ts
 * const handle = concat(
 *   [1, 2, 3],
 *   async (num, token) => {
 *     await token.sleep(10);
 *     return [num, num * 2];
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle; // [1, 2, 2, 4, 3, 6]
 * ```
 *
 * @example
 * ```ts
 * const handle = concat(
 *   { a: 'hello', b: 'world' },
 *   async (value, key) => value.split(''),
 * );
 *
 * const result = await handle; // ['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']
 * ```
 */
export function concat<I, R>(
	data: I[] | Promise<I[]>,
	iteratee: (item: I, token: CancellableToken) => Promise<R[]>,
	options?: ConcatOptions<R>,
): CancellableHandle<R[]>;
export function concat<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iteratee: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<R[]>,
	options?: ConcatOptions<R>,
): CancellableHandle<R[]>;
export function concat<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iteratee:
		| ((item: I, token: CancellableToken) => Promise<R[]>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<R[]>),
	options?: ConcatOptions<R>,
) {
	const { concurrency = Infinity } = options ?? {};

	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const entries = normalized.entries;
		const arrayIteratee = iteratee as unknown as (
			item: I,
			token: CancellableToken,
		) => Promise<R[]>;
		const objectIteratee = iteratee as unknown as (
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<R[]>;
		const invoke = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayIteratee(item, token);
			}
			return objectIteratee(item, key, token);
		};

		let results: R[][];
		if (isFinite(concurrency)) {
			results = await runWithConcurrency(entries, concurrency, (entry) => {
				return invoke(entry.value, entry.key);
			});
		} else {
			results = await Promise.all(
				entries.map((entry) => invoke(entry.value, entry.key)),
			);
		}

		return results.flat();
	}, options);
}
