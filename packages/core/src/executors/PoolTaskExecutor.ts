import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { Queue } from "../utils/Queue";
import { BaseTaskExecutor } from "./BaseTaskExecutor";
import {
	matchesCancelRequest,
	NormalizedTaskCancelRequest,
	ResolvedTaskOptions,
	resolveTaskOptions,
	TaskOptions,
} from "./ITaskExecutor";
import { TaskHandle } from "./TaskHandle";

interface QueuedTask {
	task: AsyncTask<unknown>;
	handle: TaskHandle<unknown>;
	options?: ResolvedTaskOptions;
}

const STOP_WORKER = Symbol("pool-stop-worker");
type WorkerQueueItem = QueuedTask | typeof STOP_WORKER;

/**
 * A task executor that processes tasks with a specified maximum concurrency limit.
 * It uses a pool of workers to pull tasks from a queue as soon as a worker becomes available.
 */
export class PoolTaskExecutor extends BaseTaskExecutor {
	private readonly queue = new Queue<WorkerQueueItem>();
	private readonly workers: Promise<void>[];
	private readonly running = new Map<
		TaskHandle<unknown>,
		{ options?: ResolvedTaskOptions }
	>();

	constructor(concurrency: number) {
		super();
		this.workers = Array.from({ length: concurrency }, () => this.runWorker());
	}

	exec<T>(task: AsyncTask<T>, options?: TaskOptions): TaskHandle<T> {
		this.checkShutdown("Pool executor permanently shut down");

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

		this.queue.enqueue({
			task: task as AsyncTask<unknown>,
			handle: handle as TaskHandle<unknown>,
			options: resolvedOptions,
		});

		return handle;
	}

	protected onCancelAll(reason?: unknown): void {
		const error = CancelError.fromReason("Pool executor cancelled", reason);

		while (true) {
			const item = this.queue.dequeueNow();
			if (!item || item === STOP_WORKER) {
				break;
			}
			item.handle.reject(error);
		}

		for (const [handle] of this.running) {
			handle.cancel(error);
			handle.reject(error);
		}
	}

	protected onShutdown(reason?: unknown): void {
		this.onCancelAll(reason);
		for (let i = 0; i < this.workers.length; i++) {
			this.queue.enqueue(STOP_WORKER);
		}
	}

	protected cancelFiltered(request: NormalizedTaskCancelRequest): void {
		const notMatched: QueuedTask[] = [];
		let cancelled = 0;

		for (
			let task = this.queue.dequeueNow();
			task;
			task = this.queue.dequeueNow()
		) {
			if (task === STOP_WORKER) {
				notMatched.push(task as unknown as QueuedTask);
				continue;
			}
			if (matchesCancelRequest(task.options, request)) {
				cancelled++;
				task.handle.cancel(request.reason);
				task.handle.reject(
					CancelError.fromReason("Task cancelled", request.reason),
				);
				continue;
			}
			notMatched.push(task);
		}

		for (const task of notMatched) {
			this.queue.enqueue(task as unknown as WorkerQueueItem);
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

	private async runWorker(): Promise<void> {
		while (!this.isShutdown()) {
			const item = await this.queue.dequeue();
			if (item === STOP_WORKER) {
				break;
			}

			if (item.handle.isSettled) {
				continue;
			}

			const token = new CancellableToken(
				item.handle.signal,
				item.options?.name ?? item.options?.kind,
			);
			this.running.set(item.handle, { options: item.options });

			try {
				const result = await item.task(token);
				item.handle.resolve(result);
			} catch (e) {
				item.handle.reject(e);
			} finally {
				this.running.delete(item.handle);
			}
		}
	}
}
