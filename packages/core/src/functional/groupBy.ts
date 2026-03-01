import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../common/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface GroupByOptions extends CancellableOptions {
	concurrency?: number;
}

/**
 * Groups array items by an asynchronously computed key.
 *
 * @template I - Input item type.
 * @param data - Input array, or a promise that resolves to one.
 * @param keySelector - Async key selector for each item.
 * @param options - Configuration options, including cancellation and concurrency.
 * @returns A cancellable handle resolving to grouped items.
 *
 * @example
 * ```ts
 * const handle = groupBy(
 *   [1, 2, 3, 4],
 *   async (item, token) => {
 *     await token.sleep(5);
 *     return item % 2 === 0 ? "even" : "odd";
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle; // { odd: [1, 3], even: [2, 4] }
 * ```
 *
 * @example
 * ```ts
 * const handle = groupBy(
 *   { a: 1, b: 2, c: 3 },
 *   async (value, key) => (key === "b" ? "special" : value % 2 ? "odd" : "even"),
 * );
 *
 * const result = await handle;
 * // { odd: [1, 3], special: [2] }
 * ```
 */
export function groupBy<I>(
	data: I[] | Promise<I[]>,
	keySelector: (item: I, token: CancellableToken) => Promise<PropertyKey>,
	options?: GroupByOptions,
): CancellableHandle<Record<string, I[]>>;
export function groupBy<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	keySelector: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<PropertyKey>,
	options?: GroupByOptions,
): CancellableHandle<Record<string, I[]>>;
export function groupBy<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	keySelector:
		| ((item: I, token: CancellableToken) => Promise<PropertyKey>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<PropertyKey>),
	options?: GroupByOptions,
) {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const entries = normalized.entries;
		const arraySelector = keySelector as unknown as (
			item: I,
			token: CancellableToken,
		) => Promise<PropertyKey>;
		const objectSelector = keySelector as unknown as (
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<PropertyKey>;
		const selectKey = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arraySelector(item, token);
			}
			return objectSelector(item, key, token);
		};

		const keys = isFinite(concurrency)
			? await runWithConcurrency(entries, concurrency, (entry) => {
					return selectKey(entry.value, entry.key);
				})
			: await Promise.all(
					entries.map((entry) => selectKey(entry.value, entry.key)),
				);

		const grouped: Record<string, I[]> = {};
		for (let i = 0; i < entries.length; i++) {
			const key = String(keys[i]);
			(grouped[key] ??= []).push(
				(entries[i] as (typeof entries)[number]).value,
			);
		}
		return grouped;
	}, options);
}
