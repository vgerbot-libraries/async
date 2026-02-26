import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableHandle } from "../cancellable/CancellableHandle";
import { cancellable } from "../cancellable/cancellable";
import { Defer } from "../common/Defer";
import { Pair } from "../common/Pair";
import { Queue } from "../common/Queue";

/**
 * A task executor that runs tasks in series (sequentially), one after another.
 * Tasks are queued and executed in the exact order they were submitted.
 */
export class SeriesTaskExecutor {
	private readonly queue = new Queue<
		Pair<AsyncTask<unknown>, Defer<unknown>> | undefined
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
	exec<T>(task: AsyncTask<T>) {
		const defer = new Defer<T>();

		this.queue.enqueue(
			new Pair(task as AsyncTask<unknown>, defer as Defer<unknown>),
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
