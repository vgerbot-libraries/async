import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableHandle } from "../cancellable/CancellableHandle";
import { cancellable } from "../cancellable/cancellable";
import { Defer } from "../utils/Defer";
import { Queue } from "../utils/Queue";
import { BaseTaskExecutor } from "./BaseTaskExecutor";

interface QueuedTask {
	task: AsyncTask<unknown>;
	defer: Defer<unknown>;
}

/**
 * A task executor that processes tasks with a specified maximum concurrency limit.
 * It uses a pool of workers to pull tasks from a queue as soon as a worker becomes available.
 */
export class PoolTaskExecutor extends BaseTaskExecutor {
	private readonly queue = new Queue<QueuedTask | undefined>();
	private readonly workers: CancellableHandle<void>[];

	constructor(concurrency: number) {
		super();
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
		this.checkCancelled("Pool executor permanently cancelled");

		const defer = new Defer<T>();
		this.queue.enqueue({
			task: task as AsyncTask<unknown>,
			defer: defer as Defer<unknown>,
		});
		return defer.promise;
	}

	protected onCancel(reason?: unknown): void {
		for (const handle of this.workers) {
			handle.cancel(reason);
		}
		while (true) {
			const item = this.queue.dequeueNow();
			if (!item) {
				break;
			}
			item.defer.reject(
				CancelError.fromReason("Pool executor cancelled", reason),
			);
		}
	}
}
