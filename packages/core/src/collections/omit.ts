import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { runWithConcurrency } from "../utils/concurrency";

export interface OmitOptions
	extends CancellableOptions<Record<string, unknown>> {
	concurrency?: number;
}

/**
 * Creates an object composed of properties for which the predicate returns falsy.
 * The inverse of pick - excludes properties where predicate returns true.
 *
 * @template T - The type of the object values.
 * @param obj - The object to iterate over.
 * @param predicate - An async function that tests each property.
 * @param options - Configuration options, including concurrency limit.
 * @returns A cancellable handle that resolves to an object with remaining properties.
 *
 * @example
 * ```ts
 * const data = { a: 1, b: 2, c: 3, d: 4 };
 *
 * const handle = omit(
 *   data,
 *   async (value, key, token) => {
 *     await token.sleep(10);
 *     return value % 2 === 0;
 *   },
 * );
 *
 * const result = await handle; // { a: 1, c: 3 }
 * ```
 */
export function omit<T>(
	obj: Record<string, T> | Promise<Record<string, T>>,
	predicate: (
		value: T,
		key: string,
		token: CancellableToken,
	) => Promise<boolean>,
	options?: OmitOptions,
): CancellableHandle<Record<string, T>> {
	const { concurrency = Infinity } = options ?? {};

	return cancellable(async (token) => {
		const resolvedObj = await obj;
		const entries = Object.entries(resolvedObj);

		let flags: boolean[];
		if (isFinite(concurrency)) {
			flags = await runWithConcurrency(entries, concurrency, ([key, value]) => {
				return predicate(value, key, token);
			});
		} else {
			flags = await Promise.all(
				entries.map(([key, value]) => predicate(value, key, token)),
			);
		}

		const result: Record<string, T> = {};
		for (let i = 0; i < entries.length; i++) {
			if (!flags[i]) {
				const [key, value] = entries[i];
				result[key] = value;
			}
		}

		return result;
	}, options);
}
