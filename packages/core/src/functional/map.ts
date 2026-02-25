import { cancellable, CancellableOptions,CancellableToken } from "../cancellable";
import { runWithConcurrency } from "../common/concurrency";

export interface MapOptions extends CancellableOptions {
    concurrency?: number;
}

/**
 * Maps over an array of data concurrently, applying an asynchronous callback to each element.
 * Allows controlling the maximum concurrency of the mapping operations.
 * 
 * @template I - The type of the input array items.
 * @param data - The array of data to map over.
 * @param callbackfn - An async function applied to each element, producing a mapped value.
 * @param options - Configuration options, including cancellation token and concurrency limit.
 * @returns A cancellable handle that resolves to an array of mapped values.
 */
export function map<I>( data: I[], callbackfn: (item: I, token: CancellableToken) => Promise<unknown>, options: MapOptions ) {
    const { concurrency = Infinity } = options;

    return cancellable(async (token) => {
        if(isFinite(concurrency)) {
            return runWithConcurrency(data, concurrency, (item) => {
                return callbackfn(item, token);
            });
        } else {
            const promises = data.map(async (item) => {
                return callbackfn(item, token);
            });
            return Promise.all(promises);
        }
    }, options);
}
