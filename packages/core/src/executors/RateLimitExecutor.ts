import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { Defer } from "../utils/Defer";
import { BaseTaskExecutor } from "./BaseTaskExecutor";
import {
	matchesCancelRequest,
	NormalizedTaskCancelRequest,
	ResolvedTaskOptions,
	resolveTaskOptions,
	TaskOptions,
} from "./ITaskExecutor";
import { TaskHandle } from "./TaskHandle";

interface WaitingTask {
	defer: Defer<void>;
	handle: TaskHandle<unknown>;
	options?: ResolvedTaskOptions;
}

/**
 * Configuration options for RateLimitExecutor.
 */
export interface RateLimitOptions {
	/** Maximum number of requests allowed per time window */
	maxRequests: number;
	/** Time window in milliseconds */
	windowMs: number;
}

/**
 * A task executor that limits the rate of task execution.
 * Enforces a maximum number of requests per time window using a sliding window algorithm.
 *
 * @example
 * ```ts
 * // Allow max 10 requests per second
 * const executor = new RateLimitExecutor(10, 1000);
 *
 * for (let i = 0; i < 20; i++) {
 *   executor.exec(async (token) => {
 *     console.log(`Request ${i}`);
 *     return i;
 *   });
 * }
 * // First 10 execute immediately, next 10 wait for the window to reset
 * ```
 */
export class RateLimitExecutor extends BaseTaskExecutor {
	private readonly requestTimestamps: number[] = [];
	private readonly maxRequests: number;
	private readonly windowMs: number;
	private readonly waitQueue: WaitingTask[] = [];
	private readonly running = new Map<
		TaskHandle<unknown>,
		{ options?: ResolvedTaskOptions }
	>();

	constructor(maxRequests: number, windowMs: number) {
		super();
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;
	}

	exec<T>(task: AsyncTask<T>, options?: TaskOptions): TaskHandle<T> {
		this.checkShutdown("Rate limit executor permanently shut down");

		const resolvedOptions = resolveTaskOptions(options);
		const handle = new TaskHandle<T>(
			new AbortController(),
			resolvedOptions.name ?? resolvedOptions.kind,
		);
		handle.signal.addEventListener(
			"abort",
			() => {
				handle.reject(
					CancelError.fromReason("Task cancelled", handle.signal.reason),
				);
			},
			{ once: true },
		);

		void this.runTask(
			task as AsyncTask<unknown>,
			handle as TaskHandle<unknown>,
			resolvedOptions,
		);

		return handle;
	}

	protected onCancelAll(reason?: unknown): void {
		const error = CancelError.fromReason(
			"Rate limit executor cancelled",
			reason,
		);

		while (this.waitQueue.length > 0) {
			const item = this.waitQueue.shift();
			if (item) {
				item.handle.reject(error);
				item.defer.reject(error);
			}
		}

		for (const [handle] of this.running) {
			handle.cancel(error);
			handle.reject(error);
		}
	}

	protected cancelFiltered(request: NormalizedTaskCancelRequest): void {
		let cancelled = 0;

		for (let i = this.waitQueue.length - 1; i >= 0; i--) {
			const item = this.waitQueue[i];
			if (!item) {
				continue;
			}

			if (matchesCancelRequest(item.options, request)) {
				cancelled++;
				item.handle.cancel(request.reason);
				item.handle.reject(
					CancelError.fromReason("Task cancelled", request.reason),
				);
				item.defer.reject(
					CancelError.fromReason("Task cancelled", request.reason),
				);
				this.waitQueue.splice(i, 1);
			}
		}

		for (const [handle, running] of this.running) {
			if (matchesCancelRequest(running.options, request)) {
				cancelled++;
				handle.cancel(request.reason);
				handle.reject(CancelError.fromReason("Task cancelled", request.reason));
			}
		}

		if (cancelled === 0) {
			super.cancelFiltered(request);
		}
	}

	private async acquireSlot(waitingTask: WaitingTask): Promise<void> {
		this.cleanOldTimestamps();

		// If we have capacity, record and proceed immediately
		if (this.requestTimestamps.length < this.maxRequests) {
			this.requestTimestamps.push(Date.now());
			return;
		}

		// Otherwise, wait in queue
		this.waitQueue.push(waitingTask);
		await waitingTask.defer.promise;
	}

	private releaseSlot(): void {
		// Process next waiting request if any
		if (this.waitQueue.length === 0) {
			return;
		}

		// Schedule processing after checking if slot is available
		setTimeout(() => {
			this.processNextInQueue();
		}, 0);
	}

	private processNextInQueue(): void {
		if (this.waitQueue.length === 0) {
			return;
		}

		this.cleanOldTimestamps();

		// If we have capacity now, release the next waiter
		if (this.requestTimestamps.length < this.maxRequests) {
			const item = this.waitQueue.shift();
			if (item) {
				if (item.handle.isSettled) {
					this.processNextInQueue();
					return;
				}
				this.requestTimestamps.push(Date.now());
				item.defer.resolve();
			}
			return;
		}

		// Calculate wait time until oldest request expires
		const oldestTimestamp = this.requestTimestamps[0]!;
		const waitTime = this.windowMs - (Date.now() - oldestTimestamp);

		if (waitTime > 0) {
			setTimeout(() => {
				this.processNextInQueue();
			}, waitTime);
		} else {
			// Should have capacity now, try again
			this.processNextInQueue();
		}
	}

	private async runTask(
		task: AsyncTask<unknown>,
		handle: TaskHandle<unknown>,
		options: ResolvedTaskOptions,
	): Promise<void> {
		if (handle.isSettled) {
			return;
		}

		const waitingTask: WaitingTask = {
			defer: new Defer<void>(),
			handle,
			options,
		};

		try {
			await this.acquireSlot(waitingTask);
		} catch (error) {
			handle.reject(error);
			return;
		}

		if (this.isShutdown()) {
			handle.reject(
				CancelError.fromReason(
					"Rate limit executor shut down while scheduling task",
					this.getShutdownReason(),
				),
			);
			this.releaseSlot();
			return;
		}

		if (handle.isSettled) {
			this.releaseSlot();
			return;
		}

		const token = new CancellableToken(
			handle.signal,
			options.name ?? options.kind,
		);
		this.running.set(handle, { options });

		try {
			const result = await task(token);
			handle.resolve(result);
		} catch (error) {
			handle.reject(error);
		} finally {
			this.running.delete(handle);
			this.releaseSlot();
		}
	}

	private cleanOldTimestamps(): void {
		const now = Date.now();
		const cutoff = now - this.windowMs;
		while (
			this.requestTimestamps.length > 0 &&
			this.requestTimestamps[0]! < cutoff
		) {
			this.requestTimestamps.shift();
		}
	}
}
