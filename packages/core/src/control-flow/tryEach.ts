import {
	CancellableHandle,
	CancellableOptions,
	cancellable,
} from "../cancellable";
import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Tries executing tasks in sequence until one succeeds.
 * Returns the result of the first successful task.
 * If all tasks fail, throws the last error.
 *
 * @template T - The result type.
 * @param tasks - Array of async tasks to try in order.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle resolving to the first successful result.
 *
 * @example
 * ```ts
 * const handle = tryEach([
 *   async () => { throw new Error("fail 1"); },
 *   async () => { throw new Error("fail 2"); },
 *   async () => "success",
 * ]);
 *
 * const result = await handle; // "success"
 * ```
 *
 * @example
 * ```ts
 * // Try multiple API endpoints
 * const handle = tryEach([
 *   async (token) => fetch("https://api1.example.com"),
 *   async (token) => fetch("https://api2.example.com"),
 *   async (token) => fetch("https://api3.example.com"),
 * ]);
 * ```
 */
export function tryEach<T>(
	tasks: AsyncTask<T>[],
	options?: CancellableOptions<T>,
): CancellableHandle<T> {
	return cancellable(async (token) => {
		if (tasks.length === 0) {
			throw new Error("tryEach requires at least one task");
		}

		let lastError: unknown;

		for (const task of tasks) {
			token.throwIfCancelled();
			try {
				return await task(token);
			} catch (error) {
				lastError = error;
			}
		}

		throw lastError;
	}, options);
}
