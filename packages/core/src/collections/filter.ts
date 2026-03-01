import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface FilterOptions<I = unknown> extends CancellableOptions<I[]> {
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
 *
 * @example
 * ```ts
 * const handle = filter(
 *   [1, 2, 3, 4],
 *   async (item, token) => {
 *     await token.sleep(10);
 *     return item % 2 === 0;
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle; // [2, 4]
 * ```
 *
 * @example
 * ```ts
 * const handle = filter(
 *   { a: 1, b: 2, c: 3 },
 *   async (value, key) => key !== "a" && value >= 2,
 * );
 *
 * const result = await handle; // [2, 3]
 * ```
 */
export function filter<I>(
	data: I[] | Promise<I[]>,
	predicate: (item: I, token: CancellableToken) => Promise<boolean>,
	options?: FilterOptions<I>,
): CancellableHandle<I[]>;
export function filter<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<boolean>,
	options?: FilterOptions<I>,
): CancellableHandle<I[]>;
export function filter<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate:
		| ((item: I, token: CancellableToken) => Promise<boolean>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<boolean>),
	options?: FilterOptions<I>,
) {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const entries = normalized.entries;
		const arrayPredicate = predicate as unknown as (
			item: I,
			token: CancellableToken,
		) => Promise<boolean>;
		const objectPredicate = predicate as unknown as (
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<boolean>;
		const evaluate = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayPredicate(item, token);
			}
			return objectPredicate(item, key, token);
		};
		if (isFinite(concurrency)) {
			const result: I[] = [];
			await runWithConcurrency(entries, concurrency, async (entry) => {
				const keep = await evaluate(entry.value, entry.key);
				if (keep) {
					result.push(entry.value);
				}
			});
			return result;
		}

		const flags = await Promise.all(
			entries.map((entry) => evaluate(entry.value, entry.key)),
		);
		return entries
			.filter((_, index) => flags[index])
			.map((entry) => entry.value);
	}, options);
}
