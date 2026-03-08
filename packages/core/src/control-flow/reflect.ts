import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
} from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Result of a reflected task execution.
 */
export type SettledResult<T> =
	| { status: "fulfilled"; value: T }
	| { status: "rejected"; reason: unknown };

/**
 * Wraps a task to always resolve (never reject).
 * Returns a result object indicating success or failure.
 * Useful for handling errors without try-catch or for parallel operations
 * where you want all results regardless of failures.
 *
 * @template T - The result type of the task.
 * @param task - The async task to wrap.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that always resolves to a SettledResult.
 *
 * @example
 * ```ts
 * const handle = reflect(async () => {
 *   throw new Error("failed");
 * });
 *
 * const result = await handle;
 * // result: { status: "rejected", reason: Error("failed") }
 * ```
 *
 * @example
 * ```ts
 * // Use with parallel to get all results
 * import { parallel, reflect } from "@vgerbot/async";
 *
 * const results = await parallel([
 *   reflect(async () => "success"),
 *   reflect(async () => { throw new Error("fail"); }),
 *   reflect(async () => 42),
 * ]);
 *
 * // results: [
 * //   { status: "fulfilled", value: "success" },
 * //   { status: "rejected", reason: Error("fail") },
 * //   { status: "fulfilled", value: 42 },
 * // ]
 * ```
 */
export function reflect<T>(
	task: AsyncTask<T>,
	options?: CancellableOptions<SettledResult<T>>,
): CancellableHandle<SettledResult<T>> {
	return cancellable(async (token) => {
		try {
			const value = await task(token);
			return { status: "fulfilled" as const, value };
		} catch (reason) {
			return { status: "rejected" as const, reason };
		}
	}, options);
}
