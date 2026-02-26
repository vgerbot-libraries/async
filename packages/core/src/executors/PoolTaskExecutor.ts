import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableHandle } from "../cancellable/CancellableHandle";
import { cancellable } from "../cancellable/cancellable";
import { Defer } from "../common/Defer";
import { Pair } from "../common/Pair";
import { Queue } from "../common/Queue";

/**
 * A task executor that processes tasks with a specified maximum concurrency limit.
 * It uses a pool of workers to pull tasks from a queue as soon as a worker becomes available.
 */
export class PoolTaskExecutor {
	private readonly queue = new Queue<
		Pair<AsyncTask<unknown>, Defer<unknown>> | undefined
	>();
	private readonly workers: CancellableHandle<void>[];

	constructor(concurrency: number) {
		this.workers = Array.from({ length: concurrency }, () =>
			cancellable(async (token) => {
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
			}),
		);
	}

	exec<T>(task: AsyncTask<T>): Promise<T> {
		const defer = new Defer<T>();
		this.queue.enqueue(
			new Pair(task as AsyncTask<unknown>, defer as Defer<unknown>),
		);
		return defer.promise;
	}

	cancel() {
		for (const handle of this.workers) {
			handle.cancel();
		}
	}

	isCancelled() {
		return this.workers.length > 0 && (this.workers[0]?.isCancelled() ?? false);
	}
}
