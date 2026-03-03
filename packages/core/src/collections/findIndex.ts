import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface FindIndexOptions extends CancellableOptions<number> {
	concurrency?: number;
}

/**
 * Finds the index of the first item whose async predicate resolves to true.
 * Returns -1 if no item matches.
 *
 * @template I - The input item type.
 * @param data - Input array, or a promise that resolves to one.
 * @param predicate - Async predicate to evaluate.
 * @param options - Configuration options including cancellation and concurrency.
 * @returns A cancellable handle resolving to the matched index or -1.
 *
 * @example
 * ```ts
 * const handle = findIndex(
 *   [1, 2, 3, 4],
 *   async (item, token) => {
 *     await token.sleep(10);
 *     return item > 2;
 *   },
 * );
 *
 * const index = await handle; // 2
 * ```
 */
export function findIndex<I>(
	data: I[] | Promise<I[]>,
	predicate: (item: I, token: CancellableToken) => Promise<boolean>,
	options?: FindIndexOptions,
): CancellableHandle<number>;
export function findIndex<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<boolean>,
	options?: FindIndexOptions,
): CancellableHandle<number>;
export function findIndex<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate:
		| ((item: I, token: CancellableToken) => Promise<boolean>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<boolean>),
	options?: FindIndexOptions,
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
			return -1;
		}
		const evaluate = (item: I, key: number | string) => {
			if (normalized.isArray) {
				return arrayPredicate(item, token);
			}
			return objectPredicate(item, key, token);
		};

		if (!isFinite(concurrency) || concurrency <= 0) {
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i]!;
				if (await evaluate(entry.value, entry.key)) {
					return i;
				}
				token.throwIfCancelled();
			}
			return -1;
		}

		let nextIndex = 0;
		let found = false;
		let foundIndex = -1;
		let firstError: unknown;

		async function runWorker() {
			while (!found && firstError === undefined) {
				token.throwIfCancelled();
				const index = nextIndex++;
				if (index >= entries.length) {
					return;
				}
				try {
					const entry = entries[index] as (typeof entries)[number];
					const ok = await evaluate(entry.value, entry.key);
					if (ok && !found) {
						found = true;
						foundIndex = index;
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
		return foundIndex;
	}, options);
}
