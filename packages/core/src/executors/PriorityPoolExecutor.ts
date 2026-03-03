import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableHandle } from "../cancellable/CancellableHandle";
import { cancellable } from "../cancellable/cancellable";
import { Defer } from "../utils/Defer";
import { ITaskExecutor } from "./ITaskExecutor";

interface PriorityQueuedTask {
	task: AsyncTask<unknown>;
	defer: Defer<unknown>;
	priority: number;
}

/**
 * A task executor that processes tasks with priority support.
 * Tasks with higher priority values are executed first.
 * Extends PoolTaskExecutor with priority-based scheduling.
 *
 * Note: This executor extends ITaskExecutor but adds an optional priority parameter.
 * The priority parameter is not part of the ITaskExecutor interface.
 *
 * @example
 * ```ts
 * const executor = new PriorityPoolExecutor(2);
 *
 * executor.execWithPriority(async () => "low", 1);
 * executor.execWithPriority(async () => "high", 10);
 * executor.execWithPriority(async () => "medium", 5);
 *
 * // Executes in order: high (10), medium (5), low (1)
 * ```
 */
export class PriorityPoolExecutor implements ITaskExecutor {
	private readonly pending: PriorityQueuedTask[] = [];
	private readonly workers: CancellableHandle<void>[];
	private cancelled = false;

	constructor(concurrency: number) {
		this.workers = Array.from({ length: concurrency }, () =>
			cancellable(async (token) => {
				while (!this.cancelled) {
					const item = await this.dequeue();
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
		return this.execWithPriority(task, 0);
	}

	execWithPriority<T>(task: AsyncTask<T>, priority: number): Promise<T> {
		if (this.cancelled) {
			return Promise.reject(
				CancelError.fromReason("Priority pool executor cancelled"),
			);
		}

		const defer = new Defer<T>();
		this.pending.push({
			task: task as AsyncTask<unknown>,
			defer: defer as Defer<unknown>,
			priority,
		});

		// Sort by priority (higher first)
		this.pending.sort((a, b) => b.priority - a.priority);

		return defer.promise;
	}

	cancel(reason?: unknown) {
		this.cancelled = true;
		for (const handle of this.workers) {
			handle.cancel(reason);
		}
		for (const item of this.pending.splice(0)) {
			item.defer.reject(
				CancelError.fromReason("Priority pool executor cancelled", reason),
			);
		}
	}

	isCancelled(): boolean {
		return this.cancelled;
	}

	private async dequeue(): Promise<PriorityQueuedTask | undefined> {
		while (!this.cancelled) {
			if (this.pending.length > 0) {
				return this.pending.shift();
			}
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return undefined;
	}
}
