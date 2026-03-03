import { CancellableHandle, CancellableOptions, cancellable } from "../cancellable";

/**
 * Returns a constant value wrapped in a cancellable promise.
 * Useful for creating async functions that return fixed values.
 *
 * @template T - The type of the constant value
 * @param value - The constant value to return
 * @param options - Cancellable configuration options
 * @returns A cancellable handle that resolves to the constant value
 *
 * @example
 * ```ts
 * const handle = constant(42);
 * const result = await handle; // 42
 * ```
 */
export function constant<T>(
	value: T,
	options?: CancellableOptions<T>,
): CancellableHandle<T> {
	return cancellable(async () => value, options);
}
