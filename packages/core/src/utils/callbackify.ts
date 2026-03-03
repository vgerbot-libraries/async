/**
 * Converts a Promise-returning function to a callback-style function.
 * The callback follows Node.js convention: (err, result) => void
 *
 * @template T - The result type.
 * @param fn - The Promise-returning function to convert.
 * @returns A callback-style function.
 *
 * @example
 * ```ts
 * async function fetchData(id: number): Promise<Data> {
 *   return await fetch(`/api/data/${id}`).then(r => r.json());
 * }
 *
 * const fetchDataCallback = callbackify(fetchData);
 * fetchDataCallback(123, (err, data) => {
 *   if (err) {
 *     console.error(err);
 *   } else {
 *     console.log(data);
 *   }
 * });
 * ```
 */
export function callbackify<T>(
	fn: () => Promise<T>,
): (callback: (err: Error | null, result?: T) => void) => void;
export function callbackify<A1, T>(
	fn: (arg1: A1) => Promise<T>,
): (arg1: A1, callback: (err: Error | null, result?: T) => void) => void;
export function callbackify<A1, A2, T>(
	fn: (arg1: A1, arg2: A2) => Promise<T>,
): (
	arg1: A1,
	arg2: A2,
	callback: (err: Error | null, result?: T) => void,
) => void;
export function callbackify<A1, A2, A3, T>(
	fn: (arg1: A1, arg2: A2, arg3: A3) => Promise<T>,
): (
	arg1: A1,
	arg2: A2,
	arg3: A3,
	callback: (err: Error | null, result?: T) => void,
) => void;
export function callbackify<T>(
	fn: (...args: any[]) => Promise<T>,
): (...args: any[]) => void {
	return (...args: any[]): void => {
		const callback = args[args.length - 1] as (
			err: Error | null,
			result?: T,
		) => void;
		const fnArgs = args.slice(0, -1);

		fn(...fnArgs)
			.then((result) => callback(null, result))
			.catch((err) => callback(err));
	};
}
