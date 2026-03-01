import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface SomeOptions extends CancellableOptions {
	concurrency?: number;
}

/**
 * Checks whether at least one item satisfies an async predicate.
 * Short-circuits scheduling when the first `true` is found.
 *
 * @param data - Input array, or a promise that resolves to one.
 * @param predicate - Async predicate to evaluate.
 * @param options - Configuration options including cancellation and concurrency.
 * @returns A cancellable handle resolving to true if any item matches.
 *
 * @example
 * ```ts
 * const handle = some(
 *   [2, 4, 6, 7],
 *   async (item, token) => {
 *     await token.sleep(5);
 *     return item % 2 === 1;
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const hasOdd = await handle; // true
 * ```
 *
 * @example
 * ```ts
 * const handle = some(
 *   { a: 2, b: 4, c: 5 },
 *   async (value, key) => key !== "a" && value % 2 === 1,
 * );
 *
 * const hasMatch = await handle; // true
 * ```
 */
export function some<I>(
	data: I[] | Promise<I[]>,
	predicate: (item: I, token: CancellableToken) => Promise<boolean>,
	options?: SomeOptions,
): CancellableHandle<boolean>;
export function some<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<boolean>,
	options?: SomeOptions,
): CancellableHandle<boolean>;
export function some<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate:
		| ((item: I, token: CancellableToken) => Promise<boolean>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<boolean>),
	options?: SomeOptions,
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
		if (entries.length === 0) {
			return false;
		}
		const evaluate = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayPredicate(item, token);
			}
			return objectPredicate(item, key, token);
		};

		if (!isFinite(concurrency) || concurrency <= 0) {
			for (const entry of entries) {
				if (await evaluate(entry.value, entry.key)) {
					return true;
				}
				token.throwIfCancelled();
			}
			return false;
		}

		let nextIndex = 0;
		let matched = false;
		let firstError: unknown;

		async function runWorker() {
			while (!matched && firstError === undefined) {
				token.throwIfCancelled();
				const index = nextIndex++;
				if (index >= entries.length) {
					return;
				}
				try {
					const entry = entries[index] as (typeof entries)[number];
					const ok = await evaluate(entry.value, entry.key);
					if (ok) {
						matched = true;
						return;
					}
				} catch (error) {
					if (firstError === undefined) {
						firstError = error;
					}
					return;
				}
			}
		}

		const workerCount = Math.min(Math.floor(concurrency), entries.length);
		await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

		if (firstError !== undefined) {
			throw firstError;
		}
		return matched;
	}, options);
}
