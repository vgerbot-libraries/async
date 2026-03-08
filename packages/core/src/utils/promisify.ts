/**
 * Converts a callback-style function to return a Promise.
 * The callback-style function should follow Node.js convention: (err, result) => void
 *
 * @template T - The result type.
 * @param fn - The callback-style function to convert.
 * @returns A function that returns a Promise.
 *
 * @example
 * ```ts
 * // Node.js style callback function
 * function readFile(path: string, callback: (err: Error | null, data?: string) => void) {
 *   // ... implementation
 * }
 *
 * const readFileAsync = promisify(readFile);
 * const data = await readFileAsync('/path/to/file');
 * ```
 *
 * @example
 * ```ts
 * // With multiple arguments
 * function getData(id: number, callback: (err: Error | null, result?: Data) => void) {
 *   // ... implementation
 * }
 *
 * const getDataAsync = promisify(getData);
 * const result = await getDataAsync(123);
 * ```
 */
export function promisify<T>(
	fn: (callback: (err: Error | null, result?: T) => void) => void,
): () => Promise<T>;
export function promisify<A1, T>(
	fn: (arg1: A1, callback: (err: Error | null, result?: T) => void) => void,
): (arg1: A1) => Promise<T>;
export function promisify<A1, A2, T>(
	fn: (
		arg1: A1,
		arg2: A2,
		callback: (err: Error | null, result?: T) => void,
	) => void,
): (arg1: A1, arg2: A2) => Promise<T>;
export function promisify<A1, A2, A3, T>(
	fn: (
		arg1: A1,
		arg2: A2,
		arg3: A3,
		callback: (err: Error | null, result?: T) => void,
	) => void,
): (arg1: A1, arg2: A2, arg3: A3) => Promise<T>;
export function promisify<T>(
	fn: (...args: unknown[]) => void,
): (...args: unknown[]) => Promise<T> {
	return (...args: unknown[]): Promise<T> => {
		return new Promise<T>((resolve, reject) => {
			fn(...args, (err: Error | null, result?: T) => {
				if (err) {
					reject(err);
				} else {
					resolve(result as T);
				}
			});
		});
	};
}
