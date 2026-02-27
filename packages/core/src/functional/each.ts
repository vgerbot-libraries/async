import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../common/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface EachOptions extends CancellableOptions {
	concurrency?: number;
}

/**
 * Iterates over a collection asynchronously for side effects.
 *
 * @template I - Item/value type in the collection.
 * @param data - Input array/object, or a promise that resolves to one.
 * @param iterator - Async callback invoked for each item/value.
 * @param options - Configuration options, including cancellation and concurrency.
 * @returns A cancellable handle that resolves when iteration completes.
 *
 * @example
 * ```ts
 * const handle = each(
 *   [1, 2, 3],
 *   async (item, token) => {
 *     await token.sleep(5);
 *     console.log(item);
 *   },
 *   { concurrency: 2 },
 * );
 *
 * await handle.promise;
 * ```
 *
 * @example
 * ```ts
 * const handle = each(
 *   { a: 1, b: 2 },
 *   async (value, key) => {
 *     console.log(key, value);
 *   },
 * );
 *
 * await handle.promise;
 * ```
 */
export function each<I>(
	data: I[] | Promise<I[]>,
	iterator: (item: I, token: CancellableToken) => Promise<void>,
	options?: EachOptions,
): CancellableHandle<void>;
export function each<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iterator: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<void>,
	options?: EachOptions,
): CancellableHandle<void>;
export function each<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iterator:
		| ((item: I, token: CancellableToken) => Promise<void>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<void>),
	options?: EachOptions,
) {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const entries = normalized.entries;
		const arrayIterator = iterator as unknown as (
			item: I,
			token: CancellableToken,
		) => Promise<void>;
		const objectIterator = iterator as unknown as (
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<void>;
		const invoke = async (item: I, key: number | string) => {
			if (normalized.isArray) {
				await arrayIterator(item, token);
				return;
			}
			await objectIterator(item, key, token);
		};

		if (isFinite(concurrency)) {
			await runWithConcurrency(entries, concurrency, async (entry) => {
				await invoke(entry.value, entry.key);
			});
			return;
		}

		await Promise.all(entries.map((entry) => invoke(entry.value, entry.key)));
	}, options);
}
