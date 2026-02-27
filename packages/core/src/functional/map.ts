import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../common/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface MapOptions extends CancellableOptions {
	concurrency?: number;
}

/**
 * Maps over an array of data concurrently, applying an asynchronous callback to each element.
 * Allows controlling the maximum concurrency of the mapping operations.
 *
 * @template I - The type of the input array items.
 * @param data - The array of data to map over, or a promise that resolves to one.
 * @param callbackfn - An async function applied to each element, producing a mapped value.
 * @param options - Configuration options, including cancellation token and concurrency limit.
 * @returns A cancellable handle that resolves to an array of mapped values.
 *
 * @example
 * ```ts
 * const handle = map(
 *   [1, 2, 3],
 *   async (item, token) => {
 *     await token.sleep(10);
 *     return item * 2;
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle; // [2, 4, 6]
 * ```
 *
 * @example
 * ```ts
 * const handle = map(
 *   { a: 1, b: 2 },
 *   async (value, key) => `${String(key)}:${value * 10}`,
 * );
 *
 * const result = await handle.promise; // ["a:10", "b:20"]
 * ```
 */
export function map<I, R>(
	data: I[] | Promise<I[]>,
	callbackfn: (item: I, token: CancellableToken) => Promise<R>,
	options?: MapOptions,
): CancellableHandle<R[]>;
export function map<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	callbackfn: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<R>,
	options?: MapOptions,
): CancellableHandle<R[]>;
export function map<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	callbackfn:
		| ((item: I, token: CancellableToken) => Promise<R>)
		| ((item: I, key: number | string, token: CancellableToken) => Promise<R>),
	options?: MapOptions,
) {
	const { concurrency = Infinity } = options ?? {};

	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const entries = normalized.entries;
		const arrayMapper = callbackfn as unknown as (
			item: I,
			token: CancellableToken,
		) => Promise<R>;
		const objectMapper = callbackfn as unknown as (
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<R>;
		const invoke = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayMapper(item, token);
			}
			return objectMapper(item, key, token);
		};

		if (isFinite(concurrency)) {
			return runWithConcurrency(entries, concurrency, (entry) => {
				return invoke(entry.value, entry.key);
			});
		}

		return Promise.all(entries.map((entry) => invoke(entry.value, entry.key)));
	}, options);
}
