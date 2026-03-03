import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface PartitionOptions<I = unknown>
	extends CancellableOptions<[I[], I[]]> {
	concurrency?: number;
}

/**
 * Splits a collection into two arrays based on an async predicate.
 * Returns a tuple [truthy[], falsy[]] where truthy contains items that passed
 * the predicate and falsy contains items that failed.
 *
 * @template I - The input item type.
 * @param data - Input collection, or a promise that resolves to one.
 * @param predicate - Async predicate to evaluate each item.
 * @param options - Configuration options including cancellation and concurrency.
 * @returns A cancellable handle resolving to [truthy[], falsy[]].
 *
 * @example
 * ```ts
 * const handle = partition(
 *   [1, 2, 3, 4, 5],
 *   async (item) => item % 2 === 0,
 * );
 *
 * const [evens, odds] = await handle; // [[2, 4], [1, 3, 5]]
 * ```
 */
export function partition<I>(
	data: I[] | Promise<I[]>,
	predicate: (item: I, token: CancellableToken) => Promise<boolean>,
	options?: PartitionOptions<I>,
): CancellableHandle<[I[], I[]]>;
export function partition<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<boolean>,
	options?: PartitionOptions<I>,
): CancellableHandle<[I[], I[]]>;
export function partition<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate:
		| ((item: I, token: CancellableToken) => Promise<boolean>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<boolean>),
	options?: PartitionOptions<I>,
): CancellableHandle<[I[], I[]]> {
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
		const invoke = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayPredicate(item, token);
			}
			return objectPredicate(item, key, token);
		};

		let results: boolean[];
		if (isFinite(concurrency)) {
			results = await runWithConcurrency(entries, concurrency, (entry) => {
				return invoke(entry.value, entry.key);
			});
		} else {
			results = await Promise.all(
				entries.map((entry) => invoke(entry.value, entry.key)),
			);
		}

		const truthy: I[] = [];
		const falsy: I[] = [];
		for (let i = 0; i < entries.length; i++) {
			if (results[i]) {
				truthy.push(entries[i]!.value);
			} else {
				falsy.push(entries[i]!.value);
			}
		}

		return [truthy, falsy];
	}, options);
}
