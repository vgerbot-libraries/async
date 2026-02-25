import { cancellable, CancellableOptions, CancellableToken } from "../cancellable";

/**
 * Iterates over an array of data, applying an asynchronous reducer function sequentially.
 * 
 * @template D - The type of the array data.
 * @template R - The type of the accumulated result.
 * @param data - The array of data to reduce.
 * @param reducer - An async function applied to each element, receiving the accumulator, the current item, and a cancellation token.
 * @param initialValue - The initial value for the accumulator.
 * @param options - Cancellable configuration options.
 * @returns A cancellable handle that resolves with the final accumulated value.
 */
export function reduce<D extends unknown[], R>(data: D, reducer: (acc: R, item: D[number], token: CancellableToken) => Promise<R>, initialValue: R, options?: CancellableOptions) {
    return cancellable(async (token) => {
        let acc = initialValue;
        for (const item of data) {
            acc = await reducer(acc, item, token);
        }
        return acc;
    }, options);
}
