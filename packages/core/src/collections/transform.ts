import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface TransformOptions<R = unknown> extends CancellableOptions<R> {
	concurrency?: number;
}

/**
 * Transforms a collection into an accumulator value using an async iteratee.
 * Similar to reduce but allows in-place mutation of the accumulator.
 * Useful for building objects or arrays incrementally.
 *
 * @template I - The type of the input items.
 * @template R - The type of the accumulator.
 * @param data - The collection to transform.
 * @param iteratee - An async function that mutates the accumulator for each element.
 * @param accumulator - The initial accumulator value (optional, defaults to [] or {}).
 * @param options - Configuration options, including concurrency limit.
 * @returns A cancellable handle that resolves to the final accumulator.
 *
 * @example
 * ```ts
 * const handle = transform(
 *   [1, 2, 3, 4],
 *   async (result, num, token) => {
 *     await token.sleep(10);
 *     if (num % 2 === 0) {
 *       result.push(num * 2);
 *     }
 *   },
 *   [] as number[],
 * );
 *
 * const result = await handle; // [4, 8]
 * ```
 *
 * @example
 * ```ts
 * const handle = transform(
 *   { a: 1, b: 2, c: 3 },
 *   async (result, value, key) => {
 *     result[key] = value * 10;
 *   },
 *   {} as Record<string, number>,
 * );
 *
 * const result = await handle; // { a: 10, b: 20, c: 30 }
 * ```
 */
export function transform<I, R>(
	data: I[] | Promise<I[]>,
	iteratee: (
		accumulator: R,
		item: I,
		token: CancellableToken,
	) => Promise<void> | void,
	accumulator?: R,
	options?: TransformOptions<R>,
): CancellableHandle<R>;
export function transform<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iteratee: (
		accumulator: R,
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<void> | void,
	accumulator?: R,
	options?: TransformOptions<R>,
): CancellableHandle<R>;
export function transform<I, R>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	iteratee:
		| ((
				accumulator: R,
				item: I,
				token: CancellableToken,
		  ) => Promise<void> | void)
		| ((
				accumulator: R,
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<void> | void),
	accumulator?: R,
	options?: TransformOptions<R>,
) {
	const { concurrency = Infinity } = options ?? {};

	return cancellable(async (token) => {
		const resolvedData = await data;
		const normalized = normalizeCollection(resolvedData);
		const entries = normalized.entries;

		// Default accumulator based on input type
		const acc =
			accumulator !== undefined
				? accumulator
				: normalized.isArray
					? []
					: ({} as R);

		const arrayIteratee = iteratee as unknown as (
			accumulator: R,
			item: I,
			token: CancellableToken,
		) => Promise<void> | void;
		const objectIteratee = iteratee as unknown as (
			accumulator: R,
			item: I,
			key: number | string,
			token: CancellableToken,
		) => Promise<void> | void;

		const invoke = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayIteratee(acc, item, token);
			}
			return objectIteratee(acc, item, key, token);
		};

		if (isFinite(concurrency)) {
			await runWithConcurrency(entries, concurrency, (entry) => {
				return invoke(entry.value, entry.key);
			});
		} else {
			await Promise.all(entries.map((entry) => invoke(entry.value, entry.key)));
		}

		return acc;
	}, options);
}
