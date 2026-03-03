import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";

/**
 * Type for async functions that can be composed.
 */
type AsyncFunction<TInput = unknown, TOutput = unknown> = (
	input: TInput,
	token: CancellableToken,
) => Promise<TOutput> | CancellableHandle<TOutput>;

/**
 * Composes async functions from right to left (mathematical composition).
 * The rightmost function is called first, and its result is passed to the next function.
 *
 * @param fns - Functions to compose, executed right to left.
 * @returns A composed function that executes all functions in sequence.
 *
 * @example
 * ```ts
 * const addOne = async (n: number) => n + 1;
 * const double = async (n: number) => n * 2;
 * const square = async (n: number) => n * n;
 *
 * const composed = compose(square, double, addOne);
 * const handle = composed(5); // ((5 + 1) * 2) ^ 2 = 144
 * const result = await handle; // 144
 * ```
 */
export function compose<T1, T2>(
	fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T2>;
export function compose<T1, T2, T3>(
	fn2: AsyncFunction<T2, T3>,
	fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T3>;
export function compose<T1, T2, T3, T4>(
	fn3: AsyncFunction<T3, T4>,
	fn2: AsyncFunction<T2, T3>,
	fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T4>;
export function compose<T1, T2, T3, T4, T5>(
	fn4: AsyncFunction<T4, T5>,
	fn3: AsyncFunction<T3, T4>,
	fn2: AsyncFunction<T2, T3>,
	fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T5>;
export function compose(
	...fns: AsyncFunction<unknown, unknown>[]
): (
	input: unknown,
	options?: CancellableOptions,
) => CancellableHandle<unknown> {
	return (input: unknown, options?: CancellableOptions) => {
		const resolvedOptions: CancellableOptions = {
			...options,
			name: options?.name ?? "compose",
		};

		return cancellable(async (token) => {
			let result = input;
			// Execute right to left
			for (let i = fns.length - 1; i >= 0; i--) {
				result = await fns[i](result, token);
				token.throwIfCancelled();
			}
			return result;
		}, resolvedOptions);
	};
}

/**
 * Composes async functions from left to right (sequential composition).
 * The leftmost function is called first, and its result is passed to the next function.
 * This is the reverse of compose and matches the execution order visually.
 *
 * @param fns - Functions to compose, executed left to right.
 * @returns A composed function that executes all functions in sequence.
 *
 * @example
 * ```ts
 * const addOne = async (n: number) => n + 1;
 * const double = async (n: number) => n * 2;
 * const square = async (n: number) => n * n;
 *
 * const sequenced = seq(addOne, double, square);
 * const handle = sequenced(5); // ((5 + 1) * 2) ^ 2 = 144
 * const result = await handle; // 144
 * ```
 */
export function seq<T1, T2>(
	fn1: AsyncFunction<T1, T2>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T2>;
export function seq<T1, T2, T3>(
	fn1: AsyncFunction<T1, T2>,
	fn2: AsyncFunction<T2, T3>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T3>;
export function seq<T1, T2, T3, T4>(
	fn1: AsyncFunction<T1, T2>,
	fn2: AsyncFunction<T2, T3>,
	fn3: AsyncFunction<T3, T4>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T4>;
export function seq<T1, T2, T3, T4, T5>(
	fn1: AsyncFunction<T1, T2>,
	fn2: AsyncFunction<T2, T3>,
	fn3: AsyncFunction<T3, T4>,
	fn4: AsyncFunction<T4, T5>,
): (input: T1, options?: CancellableOptions) => CancellableHandle<T5>;
export function seq(
	...fns: AsyncFunction<unknown, unknown>[]
): (
	input: unknown,
	options?: CancellableOptions,
) => CancellableHandle<unknown> {
	return (input: unknown, options?: CancellableOptions) => {
		const resolvedOptions: CancellableOptions = {
			...options,
			name: options?.name ?? "seq",
		};

		return cancellable(async (token) => {
			let result = input;
			// Execute left to right
			for (const fn of fns) {
				result = await fn(result, token);
				token.throwIfCancelled();
			}
			return result;
		}, resolvedOptions);
	};
}
