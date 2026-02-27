import {
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../common/concurrency";

export interface MapValuesOptions extends CancellableOptions {
	concurrency?: number;
}

/**
 * Maps each value of an object asynchronously while preserving original keys.
 *
 * @template T - The input object type.
 * @template R - The mapped value type.
 * @param data - The object to map, or a promise that resolves to one.
 * @param callbackfn - Async mapper invoked with each value and key.
 * @param options - Configuration options, including cancellation and concurrency.
 * @returns A cancellable handle that resolves to a mapped object.
 *
 * @example
 * ```ts
 * const handle = mapValues(
 *   { a: 1, b: 2 },
 *   async (value, key, token) => {
 *     await token.sleep(10);
 *     return `${String(key)}:${value * 2}`;
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle; // { a: "a:2", b: "b:4" }
 * ```
 */
export function mapValues<T extends Record<string, unknown>, R>(
	data: T | Promise<T>,
	callbackfn: (
		value: T[keyof T],
		key: keyof T,
		token: CancellableToken,
	) => Promise<R>,
	options?: MapValuesOptions,
) {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		const resolvedData = await data;
		const entries = Object.entries(resolvedData) as [keyof T, T[keyof T]][];

		const mappedEntries = isFinite(concurrency)
			? await runWithConcurrency(entries, concurrency, async ([key, value]) => {
					return [key, await callbackfn(value, key, token)] as const;
				})
			: await Promise.all(
					entries.map(async ([key, value]) => {
						return [key, await callbackfn(value, key, token)] as const;
					}),
				);

		const result: Partial<Record<keyof T, R>> = {};
		for (const [key, mappedValue] of mappedEntries) {
			result[key] = mappedValue;
		}
		return result as { [K in keyof T]: R };
	}, options);
}
