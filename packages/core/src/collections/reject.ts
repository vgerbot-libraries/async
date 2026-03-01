import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface RejectOptions<I = unknown> extends CancellableOptions<I[]> {
	concurrency?: number;
}

/**
 * Filters out items for which the async predicate returns true.
 *
 * @template I - Item/value type in the collection.
 * @param data - Input array/object, or a promise that resolves to one.
 * @param predicate - Async predicate used to remove matching items.
 * @param options - Configuration options, including cancellation and concurrency.
 * @returns A cancellable handle resolving to kept values.
 *
 * @example
 * ```ts
 * const handle = reject(
 *   [1, 2, 3, 4],
 *   async (item) => item % 2 === 0,
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle; // [1, 3]
 * ```
 *
 * @example
 * ```ts
 * const handle = reject(
 *   { a: 1, b: 2, c: 3 },
 *   async (value, key) => key === "b" || value < 2,
 * );
 *
 * const result = await handle; // [3]
 * ```
 */
export function reject<I>(
	data: I[] | Promise<I[]>,
	predicate: (item: I, token: CancellableToken) => Promise<boolean>,
	options?: RejectOptions<I>,
): CancellableHandle<I[]>;
export function reject<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<boolean>,
	options?: RejectOptions<I>,
): CancellableHandle<I[]>;
export function reject<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate:
		| ((item: I, token: CancellableToken) => Promise<boolean>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<boolean>),
	options?: RejectOptions<I>,
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
		const evaluate = async (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayPredicate(item, token);
			}
			return objectPredicate(item, key, token);
		};

		const flags = isFinite(concurrency)
			? await runWithConcurrency(entries, concurrency, async (entry) => {
					return evaluate(entry.value, entry.key);
				})
			: await Promise.all(
					entries.map((entry) => evaluate(entry.value, entry.key)),
				);

		return entries
			.filter((_, index) => !flags[index])
			.map((entry) => entry.value) as I[];
	}, options);
}
