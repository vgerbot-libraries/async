import { CancelError } from "../cancellable/CancelError";
import { CancellableHandle } from "../cancellable/CancellableHandle";
import { CancellableToken } from "../cancellable/CancellableToken";
import { cancellable } from "../cancellable/cancellable";
import { Defer } from "../common/Defer";
import { Pair } from "../common/Pair";
import { Queue } from "../common/Queue";

export type SeriesTask<T> = (token: CancellableToken) => Promise<T>;

export class SeriesTaskExecutor {
	private readonly queue = new Queue<
		Pair<SeriesTask<unknown>, Defer<unknown>> | undefined
	>();
	private readonly cancellableHandle: CancellableHandle<void>;
	constructor() {
		this.cancellableHandle = cancellable(async (token) => {
			while (!this.isCancelled()) {
				const pair = await this.queue.dequeue();
				if (pair) {
					const { first, second } = pair;
					try {
						const result = await first(token);
						second.resolve(result);
					} catch (e) {
						second.reject(e);
						if (e instanceof CancelError) {
							throw e;
						}
					}
				}
				token.throwIfCancelled();
			}
		});
	}
	exec<T>(task: SeriesTask<T>) {
		const defer = new Defer<T>();

		this.queue.enqueue(
			new Pair(task as SeriesTask<unknown>, defer as Defer<unknown>),
		);
		return defer;
	}
	cancel() {
		this.cancellableHandle.cancel();
	}
	isCancelled() {
		return this.cancellableHandle.isCancelled();
	}
}
