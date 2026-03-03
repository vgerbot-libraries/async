import {
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";

export type WhilstTest = (
	token: CancellableToken,
) => boolean | Promise<boolean>;
export type WhilstIteratee = (token: CancellableToken) => void | Promise<void>;

/**
 * Repeatedly runs an iteratee while the async test returns true.
 *
 * @param test - Condition evaluated before each iteration.
 * @param iteratee - Async body executed while `test` is true.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that resolves when the loop exits.
 *
 * @example
 * ```ts
 * let count = 0;
 * const handle = whilst(
 *   async () => count < 3,
 *   async (token) => {
 *     await token.sleep(5);
 *     count++;
 *   },
 * );
 *
 * await handle;
 * // count === 3
 * ```
 */
export function whilst(
	test: WhilstTest,
	iteratee: WhilstIteratee,
	options?: CancellableOptions,
) {
	return cancellable(async (token) => {
		while (await test(token)) {
			token.throwIfCancelled();
			await iteratee(token);
		}
	}, options);
}

/**
 * Repeatedly runs an iteratee until the async test returns true.
 *
 * @param test - Exit condition evaluated before each iteration.
 * @param iteratee - Async body executed until `test` is true.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that resolves when the loop exits.
 *
 * @example
 * ```ts
 * let done = false;
 * let ticks = 0;
 * const handle = until(
 *   async () => done,
 *   async (token) => {
 *     await token.sleep(5);
 *     ticks++;
 *     if (ticks >= 2) done = true;
 *   },
 * );
 *
 * await handle;
 * // ticks === 2
 * ```
 */
export function until(
	test: WhilstTest,
	iteratee: WhilstIteratee,
	options?: CancellableOptions,
) {
	return whilst(async (token) => !(await test(token)), iteratee, options);
}

/**
 * Executes an iteratee at least once, then repeatedly while the async test returns true.
 * Similar to whilst but the test is evaluated after each iteration (do-while loop).
 *
 * @param iteratee - Async body executed at least once, then while `test` is true.
 * @param test - Condition evaluated after each iteration.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that resolves when the loop exits.
 *
 * @example
 * ```ts
 * let count = 0;
 * const handle = doWhilst(
 *   async (token) => {
 *     await token.sleep(5);
 *     count++;
 *   },
 *   async () => count < 3,
 * );
 *
 * await handle;
 * // count === 3
 * ```
 */
export function doWhilst(
	iteratee: WhilstIteratee,
	test: WhilstTest,
	options?: CancellableOptions,
) {
	return cancellable(async (token) => {
		do {
			token.throwIfCancelled();
			await iteratee(token);
		} while (await test(token));
	}, options);
}

/**
 * Executes an iteratee at least once, then repeatedly until the async test returns true.
 * Similar to until but the test is evaluated after each iteration (do-until loop).
 *
 * @param iteratee - Async body executed at least once, then until `test` is true.
 * @param test - Exit condition evaluated after each iteration.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that resolves when the loop exits.
 *
 * @example
 * ```ts
 * let done = false;
 * let ticks = 0;
 * const handle = doUntil(
 *   async (token) => {
 *     await token.sleep(5);
 *     ticks++;
 *     if (ticks >= 2) done = true;
 *   },
 *   async () => done,
 * );
 *
 * await handle;
 * // ticks === 2
 * ```
 */
export function doUntil(
	iteratee: WhilstIteratee,
	test: WhilstTest,
	options?: CancellableOptions,
) {
	return doWhilst(iteratee, async (token) => !(await test(token)), options);
}
