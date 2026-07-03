import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { CancellableOptions } from "../cancellable/options";
import { Defer } from "../utils/Defer";

/**
 * Async worker signature used by the queue.
 *
 * The queue invokes this worker for each enqueued task. The provided token is
 * linked to queue cancellation, so a cancelled queue can interrupt running work
 * if the worker cooperates with token cancellation utilities.
 *
 * @template T - Input task payload type.
 * @template R - Worker result type.
 */
export type QueueWorker<T, R> = (
	task: T,
	token: CancellableToken,
) => Promise<R>;

/**
 * Configuration for `queue()`.
 *
 * @property concurrency - Maximum number of concurrently running workers.
 * Values less than 1 are clamped to 1.
 * @property startPaused - If true, the queue starts in paused mode and will not
 * process tasks until `resume()` is called.
 * @property signal - Optional external abort signal. Aborting it cancels the queue.
 */
export interface QueueOptions extends CancellableOptions {
	concurrency?: number;
	startPaused?: boolean;
}

export interface QueueTaskError<T> {
	task: T;
	error: unknown;
}

/**
 * Concurrency-limited async task queue.
 *
 * The queue accepts tasks (`push`) and processes them with the configured worker
 * while respecting `concurrency`. It supports pause/resume, cancellation, and
 * idle notifications.
 *
 * Cancellation semantics:
 * - Pending tasks are rejected with `CancelError`.
 * - Running tasks receive a cancelled token and may stop if they honor it.
 */
export interface TaskQueue<T, R> {
	/** Cancels the queue with an optional reason. */
	cancel(reason?: unknown): void;
	/** Returns true if the queue has been cancelled. */
	isCancelled(): boolean;
	/**
	 * Enqueues a single task.
	 * @returns A promise that resolves/rejects with the worker outcome for this task.
	 */
	push(task: T): Promise<R>;
	/**
	 * Enqueues multiple tasks.
	 * @returns A promise resolving to results in input order.
	 */
	pushMany(tasks: T[]): Promise<R[]>;
	/** Pauses scheduling new tasks (running tasks continue). */
	pause(): void;
	/** Resumes scheduling after `pause()`. */
	resume(): void;
	/**
	 * Resolves when the queue becomes idle (no pending and no running tasks).
	 * If already idle, resolves immediately.
	 */
	onIdle(): Promise<void>;
	/** Resolves with the next task execution error. */
	onError(): Promise<QueueTaskError<T>>;
	/** Resolves when queued task count becomes zero (running tasks may still exist). */
	onEmpty(): Promise<void>;
	/** Resolves when running task count reaches configured concurrency. */
	onSaturated(): Promise<void>;
	/** Resolves when queued task count becomes less than the provided threshold. */
	onSizeLessThan(size: number): Promise<void>;
	/** Number of queued tasks waiting to be processed. */
	readonly length: number;
	/** Number of tasks currently executing. */
	readonly running: number;
	/** True when both `length` and `running` are zero. */
	readonly idle: boolean;
	/** True when scheduling is paused. */
	readonly paused: boolean;
}

interface EnqueuedTask<T, R> {
	task: T;
	defer: Defer<R>;
}

interface SizeLessThanWaiter {
	size: number;
	defer: Defer<void>;
}

class DefaultTaskQueue<T, R> implements TaskQueue<T, R> {
	private readonly pending: EnqueuedTask<T, R>[] = [];
	private readonly idleWaiters: Defer<void>[] = [];
	private readonly emptyWaiters: Defer<void>[] = [];
	private readonly saturatedWaiters: Defer<void>[] = [];
	private readonly errorWaiters: Defer<QueueTaskError<T>>[] = [];
	private readonly sizeLessThanWaiters: SizeLessThanWaiter[] = [];
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

	/** @inheritdoc */
	push(task: T): Promise<R> {
		if (this.isCancelled()) {
			return Promise.reject(
				CancelError.fromReason(
					"Queue cancelled",
					this.abortController.signal.reason,
				),
			);
		}
		const defer = new Defer<R>();
		this.pending.push({ task, defer });
		this.process();
		return defer.promise;
	}

	/** @inheritdoc */
	pushMany(tasks: T[]): Promise<R[]> {
		return Promise.all(tasks.map((task) => this.push(task)));
	}

	/** @inheritdoc */
	pause() {
		this.isPaused = true;
	}

	/** @inheritdoc */
	resume() {
		if (!this.isPaused || this.isCancelled()) {
			return;
		}
		this.isPaused = false;
		this.process();
	}

	/** @inheritdoc */
	onIdle(): Promise<void> {
		if (this.idle) {
			return Promise.resolve();
		}
		const defer = new Defer<void>();
		this.idleWaiters.push(defer);
		return defer.promise;
	}

	/** @inheritdoc */
	onError(): Promise<QueueTaskError<T>> {
		const defer = new Defer<QueueTaskError<T>>();
		this.errorWaiters.push(defer);
		return defer.promise;
	}

	/** @inheritdoc */
	onEmpty(): Promise<void> {
		if (this.length === 0) {
			return Promise.resolve();
		}
		const defer = new Defer<void>();
		this.emptyWaiters.push(defer);
		return defer.promise;
	}

	/** @inheritdoc */
	onSaturated(): Promise<void> {
		if (this.running >= this.concurrency) {
			return Promise.resolve();
		}
		const defer = new Defer<void>();
		this.saturatedWaiters.push(defer);
		return defer.promise;
	}

	/** @inheritdoc */
	onSizeLessThan(size: number): Promise<void> {
		const threshold = Math.floor(size);
		if (!Number.isFinite(threshold) || threshold <= 0) {
			throw new RangeError("size must be a positive finite number");
		}
		if (this.length < threshold) {
			return Promise.resolve();
		}
		const defer = new Defer<void>();
		this.sizeLessThanWaiters.push({ size: threshold, defer });
		return defer.promise;
	}

	/**
	 * Cancels the queue.
	 *
	 * Pending tasks are rejected immediately. Running tasks are not force-killed,
	 * but receive cancellation through the shared token.
	 */
	cancel(reason?: unknown) {
		if (this.isCancelled()) {
			return;
		}
		this.abortController.abort(reason);
		const hadPending = this.pending.length > 0;
		const error = CancelError.fromReason("Queue cancelled", reason);
		for (const item of this.pending.splice(0)) {
			item.defer.reject(error);
		}
		if (hadPending) {
			this.resolveEmptyWaiters();
			this.resolveSizeLessThanWaiters();
		}
		this.resolveIdleWaiters();
	}

	/** @inheritdoc */
	isCancelled() {
		return this.abortController.signal.aborted;
	}

	/** @inheritdoc */
	get length() {
		return this.pending.length;
	}

	/** @inheritdoc */
	get running() {
		return this.active;
	}

	/** @inheritdoc */
	get idle() {
		return this.pending.length === 0 && this.active === 0;
	}

	/** @inheritdoc */
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
			const previousLength = this.pending.length;
			const current = this.pending.shift() as EnqueuedTask<T, R>;
			if (previousLength > 0 && this.pending.length === 0) {
				this.resolveEmptyWaiters();
			}
			this.resolveSizeLessThanWaiters();
			this.active++;
			if (this.active >= this.concurrency) {
				this.resolveSaturatedWaiters();
			}
			const token = new CancellableToken(this.abortController.signal);
			this.worker(current.task, token)
				.then(
					(result) => current.defer.resolve(result),
					(error) => {
						this.resolveErrorWaiters({ task: current.task, error });
						current.defer.reject(error);
					},
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

	private resolveEmptyWaiters() {
		for (const waiter of this.emptyWaiters.splice(0)) {
			waiter.resolve();
		}
	}

	private resolveSaturatedWaiters() {
		for (const waiter of this.saturatedWaiters.splice(0)) {
			waiter.resolve();
		}
	}

	private resolveErrorWaiters(error: QueueTaskError<T>) {
		for (const waiter of this.errorWaiters.splice(0)) {
			waiter.resolve(error);
		}
	}

	private resolveSizeLessThanWaiters() {
		if (this.sizeLessThanWaiters.length === 0) {
			return;
		}
		const retained: SizeLessThanWaiter[] = [];
		for (const waiter of this.sizeLessThanWaiters) {
			if (this.length < waiter.size) {
				waiter.defer.resolve();
				continue;
			}
			retained.push(waiter);
		}
		this.sizeLessThanWaiters.length = 0;
		this.sizeLessThanWaiters.push(...retained);
	}
}

/**
 * Creates a concurrency-limited async task queue.
 *
 * The returned queue processes tasks in FIFO order while allowing up to
 * `options.concurrency` tasks to run at the same time.
 *
 * @template T - Input task payload type.
 * @template R - Worker result type.
 * @param worker - Async worker function used to process each task.
 * @param options - Optional queue configuration.
 * @returns A `TaskQueue` instance with enqueue, flow-control, and cancellation APIs.
 *
 * @example
 * ```ts
 * import { queue } from "@vgerbot/async";
 *
 * const q = queue(
 *   async (task: { id: number; ms: number }, token) => {
 *     await token.sleep(task.ms);
 *     return `done:${task.id}`;
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const p1 = q.push({ id: 1, ms: 100 });
 * const p2 = q.push({ id: 2, ms: 50 });
 * const p3 = q.push({ id: 3, ms: 10 });
 *
 * const results = await Promise.all([p1, p2, p3]);
 * await q.onIdle();
 *
 * // results -> ["done:1", "done:2", "done:3"]
 * // q.idle -> true
 * ```
 */
export function queue<T, R>(
	worker: QueueWorker<T, R>,
	options?: QueueOptions,
): TaskQueue<T, R> {
	return new DefaultTaskQueue(worker, options);
}
