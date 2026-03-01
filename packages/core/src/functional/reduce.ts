import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { CollectionInput, normalizeCollection } from "./internalCollection";

/**
 * Iterates over an array of data, applying an asynchronous reducer function sequentially.
 *
 * @template D - The type of the array data.
 * @template R - The type of the accumulated result.
 * @param data - The array of data to reduce.
 * @param reducer - An async function applied to each element, receiving the accumulator, the current item, and a cancellation token.
 * @param initialValue - The initial value for the accumulator.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that resolves with the final accumulated value.
 *
 * @example
 * ```ts
 * const handle = reduce(
 *   [1, 2, 3],
 *   async (acc, item, token) => {
 *     await token.sleep(5);
 *     return acc + item;
 *   },
 *   0,
 * );
 *
 * const result = await handle; // 6
 * ```
 *
 * @example
 * ```ts
 * const handle = reduce(
 *   { a: 1, b: 2 },
 *   async (acc, value, key) => `${acc}${String(key)}=${value};`,
 *   "",
 * );
 *
 * const result = await handle; // "a=1;b=2;"
 * ```
 */
export function reduce<I, R>(
	data: I[] | Promise<I[]>,
	reducer: (acc: R, item: I, token: CancellableToken) => Promise<R>,
	initialValue: R,
	options?: CancellableOptions,
): CancellableHandle<R>;
export function reduce<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	reducer: (
		acc: R,
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<R>,
	initialValue: R,
	options?: CancellableOptions,
): CancellableHandle<R>;
export function reduce<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	reducer:
		| ((acc: R, item: I, token: CancellableToken) => Promise<R>)
		| ((
				acc: R,
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<R>),
	initialValue: R,
	options?: CancellableOptions,
) {
	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const arrayReducer = reducer as unknown as (
			acc: R,
			item: I,
			token: CancellableToken,
		) => Promise<R>;
		const objectReducer = reducer as unknown as (
			acc: R,
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<R>;
		let acc = initialValue;
		for (const entry of normalized.entries) {
			if (normalized.isArray) {
				acc = await arrayReducer(acc, entry.value, token);
			} else {
				acc = await objectReducer(acc, entry.value, entry.key, token);
			}
		}
		return acc;
	}, options);
}
