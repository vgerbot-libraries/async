import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableHandle } from "../cancellable/CancellableHandle";
import { cancellable } from "../cancellable/cancellable";
import { Defer } from "../utils/Defer";
import { Queue } from "../utils/Queue";
import { ITaskExecutor } from "./ITaskExecutor";

interface QueuedTask {
	task: AsyncTask<unknown>;
	defer: Defer<unknown>;
}

/**
 * A task executor that processes tasks with a specified maximum concurrency limit.
 * It uses a pool of workers to pull tasks from a queue as soon as a worker becomes available.
 */
export class PoolTaskExecutor implements ITaskExecutor {
	private readonly queue = new Queue<QueuedTask | undefined>();
	private readonly workers: CancellableHandle<void>[];

	constructor(concurrency: number) {
		this.workers = Array.from({ length: concurrency }, () =>
			cancellable(async (token) => {
				while (!this.isCancelled()) {
					const item = await this.queue.dequeue();
					if (item) {
						try {
							const result = await item.task(token);
							item.defer.resolve(result);
						} catch (e) {
							item.defer.reject(e);
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
		this.queue.enqueue({
			task: task as AsyncTask<unknown>,
			defer: defer as Defer<unknown>,
		});
		return defer.promise;
	}

	cancel() {
		for (const handle of this.workers) {
			handle.cancel();
		}
		while (true) {
			const item = this.queue.dequeueNow();
			if (!item) {
				break;
			}
			item.defer.reject(
				CancelError.fromReason(
					"[cancellable] cancelled: task executor cancelled",
					"task executor cancelled",
				),
			);
		}
	}

	isCancelled() {
		if (!this.workers) {
			return false;
		}
		return this.workers.length > 0 && (this.workers[0]?.isCancelled() ?? false);
	}
}
