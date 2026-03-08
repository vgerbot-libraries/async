import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { Defer } from "../utils/Defer";
import { QueueOptions, QueueWorker, TaskQueue } from "./queue";

/**
 * Priority task queue interface extending the base TaskQueue.
 * Tasks with higher priority values are processed first.
 */
export interface PriorityTaskQueue<T, R>
	extends Omit<TaskQueue<T, R>, "push" | "pushMany"> {
	/**
	 * Enqueues a single task with optional priority.
	 * @param task - The task to enqueue.
	 * @param priority - Priority value (higher = processed first). Default: 0.
	 * @returns A promise that resolves/rejects with the worker outcome.
	 */
	push(task: T, priority?: number): Promise<R>;
	/**
	 * Enqueues multiple tasks with the same priority.
	 * @param tasks - Array of tasks to enqueue.
	 * @param priority - Priority value for all tasks. Default: 0.
	 * @returns A promise resolving to results in input order.
	 */
	pushMany(tasks: T[], priority?: number): Promise<R[]>;
}

interface PriorityEnqueuedTask<T, R> {
	task: T;
	defer: Defer<R>;
	priority: number;
}

class DefaultPriorityTaskQueue<T, R> implements PriorityTaskQueue<T, R> {
	private readonly pending: PriorityEnqueuedTask<T, R>[] = [];
	private readonly idleWaiters: Defer<void>[] = [];
	private readonly abortController: AbortController;
	private active = 0;
	private isPaused: boolean;
	private readonly concurrency: number;

	constructor(
		private readonly worker: QueueWorker<T, R>,
		options?: QueueOptions,
	) {
		this.abortController = new AbortController();
		if (options?.signal) {
			options.signal.addEventListener("abort", () => {
				this.cancel(options.signal?.reason);
			});
		}
		this.concurrency = Math.max(1, Math.floor(options?.concurrency ?? 1));
		this.isPaused = options?.startPaused ?? false;
	}

	push(task: T, priority = 0): Promise<R> {
		if (this.isCancelled()) {
			return Promise.reject(
				CancelError.fromReason(
					"Queue cancelled",
					this.abortController.signal.reason,
				).withRejectionSite(),
			);
		}
		const defer = new Defer<R>();
		this.pending.push({ task, defer, priority });
		// Sort by priority (higher priority first)
		this.pending.sort((a, b) => b.priority - a.priority);
		this.process();
		return defer.promise;
	}

	pushMany(tasks: T[], priority = 0): Promise<R[]> {
		return Promise.all(tasks.map((task) => this.push(task, priority)));
	}

	pause() {
		this.isPaused = true;
	}

	resume() {
		if (!this.isPaused || this.isCancelled()) {
			return;
		}
		this.isPaused = false;
		this.process();
	}

	onIdle(): Promise<void> {
		if (this.idle) {
			return Promise.resolve();
		}
		const defer = new Defer<void>();
		this.idleWaiters.push(defer);
		return defer.promise;
	}

	cancel(reason?: unknown) {
		if (this.isCancelled()) {
			return;
		}
		this.abortController.abort(reason);
		const error = CancelError.fromReason(
			"Queue cancelled",
			reason,
		).withRejectionSite();
		for (const item of this.pending.splice(0)) {
			item.defer.reject(error);
		}
		this.resolveIdleWaiters();
	}

	isCancelled() {
		return this.abortController.signal.aborted;
	}

	get length() {
		return this.pending.length;
	}

	get running() {
		return this.active;
	}

	get idle() {
		return this.pending.length === 0 && this.active === 0;
	}

	get paused() {
		return this.isPaused;
	}

	private process() {
		while (
			!this.isPaused &&
			!this.isCancelled() &&
			this.active < this.concurrency &&
			this.pending.length > 0
		) {
			const current = this.pending.shift() as PriorityEnqueuedTask<T, R>;
			this.active++;
			const token = new CancellableToken(this.abortController.signal);
			this.worker(current.task, token)
				.then(
					(result) => current.defer.resolve(result),
					(error) => current.defer.reject(error),
				)
				.finally(() => {
					this.active--;
					if (this.idle) {
						this.resolveIdleWaiters();
					}
					this.process();
				});
		}

		if (this.idle) {
			this.resolveIdleWaiters();
		}
	}

	private resolveIdleWaiters() {
		for (const waiter of this.idleWaiters.splice(0)) {
			waiter.resolve();
		}
	}
}

/**
 * Creates a priority-based async task queue.
 * Tasks with higher priority values are processed before lower priority tasks.
 *
 * @template T - Input task payload type.
 * @template R - Worker result type.
 * @param worker - Async worker function used to process each task.
 * @param options - Optional queue configuration.
 * @returns A PriorityTaskQueue instance.
 *
 * @example
 * ```ts
 * const q = priorityQueue(
 *   async (task: string, token) => {
 *     await token.sleep(100);
 *     return `processed: ${task}`;
 *   },
 *   { concurrency: 1 },
 * );
 *
 * q.push("low", 1);
 * q.push("high", 10);
 * q.push("medium", 5);
 *
 * // Processes in order: high (10), medium (5), low (1)
 * ```
 */
export function priorityQueue<T, R>(
	worker: QueueWorker<T, R>,
	options?: QueueOptions,
): PriorityTaskQueue<T, R> {
	return new DefaultPriorityTaskQueue(worker, options);
}
