import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";
import { CollectionInput, normalizeCollection } from "./internalCollection";

export interface DetectOptions<I = unknown>
	extends CancellableOptions<I | undefined> {
	concurrency?: number;
}

/**
 * Finds the first item whose async predicate resolves to true.
 * With concurrency > 1, it short-circuits scheduling new work after a match is found.
 *
 * @template I - The input item type.
 * @param data - Input array, or a promise that resolves to one.
 * @param predicate - Async predicate to evaluate.
 * @param options - Configuration options including cancellation and concurrency.
 * @returns A cancellable handle resolving to the matched item or undefined.
 *
 * @example
 * ```ts
 * const handle = detect(
 *   [1, 2, 3, 4],
 *   async (item, token) => {
 *     await token.sleep(10);
 *     return item > 2;
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const found = await handle; // 3
 * ```
 *
 * @example
 * ```ts
 * const handle = detect(
 *   { a: 1, b: 4, c: 2 },
 *   async (value, key) => key === "b" && value > 3,
 * );
 *
 * const found = await handle; // 4
 * ```
 */
export function detect<I>(
	data: I[] | Promise<I[]>,
	predicate: (item: I, token: CancellableToken) => Promise<boolean>,
	options?: DetectOptions<I>,
): CancellableHandle<I | undefined>;
export function detect<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate: (
		item: I,
		key: number | string,
		token: CancellableToken,
	) => Promise<boolean>,
	options?: DetectOptions<I>,
): CancellableHandle<I | undefined>;
export function detect<I>(
	data: CollectionInput<I> | Promise<CollectionInput<I>>,
	predicate:
		| ((item: I, token: CancellableToken) => Promise<boolean>)
		| ((
				item: I,
				key: number | string,
				token: CancellableToken,
		  ) => Promise<boolean>),
	options?: DetectOptions<I>,
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
			return undefined;
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
					return entry.value;
				}
				token.throwIfCancelled();
			}
			return undefined;
		}

		let nextIndex = 0;
		let found = false;
		let foundValue: I | undefined;
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
						foundValue = entry.value;
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
		return foundValue;
	}, options);
}
