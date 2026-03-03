import { CancellableHandle, CancellableOptions, cancellable } from "../cancellable";

/**
 * Creates a cancellable delay that resolves after the specified duration.
 * Useful for adding pauses in async workflows.
 *
 * @param ms - The delay duration in milliseconds
 * @param options - Cancellable configuration options
 * @returns A cancellable handle that resolves after the delay
 *
 * @example
 * ```ts
 * await delay(1000); // Wait 1 second
 * ```
 *
 * @example
 * ```ts
 * const handle = delay(5000);
 * // Cancel the delay early
 * handle.cancel();
 * ```
 */
export function delay(
	ms: number,
	options?: CancellableOptions<void>,
): CancellableHandle<void> {
	return cancellable(async (token) => {
		await token.sleep(ms);
	}, options);
}
