import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { BaseTaskExecutor } from "./BaseTaskExecutor";
import {
	matchesCancelRequest,
	NormalizedTaskCancelRequest,
	ResolvedTaskOptions,
	resolveTaskOptions,
	TaskOptions,
} from "./ITaskExecutor";
import { TaskHandle } from "./TaskHandle";

/**
 * Task options for `PriorityPoolExecutor`.
 * Extends `TaskOptions` with an optional `priority` field.
 * Higher priority values are scheduled first; defaults to `0` when omitted.
 */
export interface PriorityTaskOptions extends TaskOptions {
	readonly priority?: number;
}

interface PriorityQueuedTask {
	task: AsyncTask<unknown>;
	handle: TaskHandle<unknown>;
	priority: number;
	options?: ResolvedTaskOptions;
}

/**
 * Max-heap priority queue implementation for task scheduling.
 * Higher priority values are dequeued first.
 */
class PriorityQueue<T extends { priority: number }> {
	private heap: T[] = [];

	get size(): number {
		return this.heap.length;
	}

	enqueue(item: T): void {
		this.heap.push(item);
		this.bubbleUp(this.heap.length - 1);
	}

	dequeue(): T | undefined {
		if (this.heap.length === 0) return undefined;
		if (this.heap.length === 1) return this.heap.pop();

		const top = this.heap[0];
		this.heap[0] = this.heap.pop()!;
		this.bubbleDown(0);
		return top;
	}

	clear(): T[] {
		return this.heap.splice(0);
	}

	private bubbleUp(index: number): void {
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);
			const current = this.heap[index];
			const parent = this.heap[parentIndex];
			if (!current || !parent || current.priority <= parent.priority) break;

			this.heap[index] = parent;
			this.heap[parentIndex] = current;
			index = parentIndex;
		}
	}

	private bubbleDown(index: number): void {
		while (true) {
			const leftChild = 2 * index + 1;
			const rightChild = 2 * index + 2;
			let largest = index;

			const current = this.heap[index];
			const left = this.heap[leftChild];
			const right = this.heap[rightChild];

			if (left && current && left.priority > current.priority) {
				largest = leftChild;
			}

			const largestItem = this.heap[largest];
			if (right && largestItem && right.priority > largestItem.priority) {
				largest = rightChild;
			}

			if (largest === index) break;

			const temp = this.heap[index];
			const swap = this.heap[largest];
			if (temp && swap) {
				this.heap[index] = swap;
				this.heap[largest] = temp;
			}
			index = largest;
		}
	}
}

/**
 * A task executor that processes tasks with priority support.
 * Tasks with higher priority values are executed first.
 * Uses an internal max-heap priority queue for scheduling, with a pool of
 * concurrent workers that pull the highest-priority pending task when freed.
 *
 * The `exec()` method accepts `PriorityTaskOptions`, which extends `TaskOptions`
 * with an optional `priority` field (default `0`).
 *
 * @example
 * ```ts
 * const executor = new PriorityPoolExecutor(2);
 *
 * executor.exec(async () => "low", { priority: 1 });
 * executor.exec(async () => "high", { priority: 10 });
 * executor.exec(async () => "medium", { priority: 5 });
 *
 * // Executes in order: high (10), medium (5), low (1)
 * ```
 */
export class PriorityPoolExecutor extends BaseTaskExecutor {
	private readonly pending = new PriorityQueue<PriorityQueuedTask>();
	private readonly running = new Map<
		TaskHandle<unknown>,
		{ options?: ResolvedTaskOptions }
	>();

	constructor(concurrency: number) {
		super();
		Array.from({ length: concurrency }, () => this.runWorker());
	}

	exec<T>(task: AsyncTask<T>, options?: PriorityTaskOptions): TaskHandle<T> {
		this.checkShutdown("Priority pool executor permanently shut down");

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

		this.pending.enqueue({
			task: task as AsyncTask<unknown>,
			handle: handle as TaskHandle<unknown>,
			priority: options?.priority ?? 0,
			options: resolvedOptions,
		});

		return handle;
	}

	protected onCancelAll(reason?: unknown): void {
		const error = CancelError.fromReason(
			"Priority pool executor cancelled",
			reason,
		);
		for (const item of this.pending.clear()) {
			item.handle.reject(error);
		}

		for (const [handle] of this.running) {
			handle.cancel(error);
			handle.reject(error);
		}
	}

	protected cancelFiltered(request: NormalizedTaskCancelRequest): void {
		const retained: PriorityQueuedTask[] = [];
		let cancelled = 0;

		for (
			let item = this.pending.dequeue();
			item;
			item = this.pending.dequeue()
		) {
			if (matchesCancelRequest(item.options, request)) {
				cancelled++;
				item.handle.cancel(request.reason);
				item.handle.reject(
					CancelError.fromReason("Task cancelled", request.reason),
				);
				continue;
			}
			retained.push(item);
		}

		for (const item of retained) {
			this.pending.enqueue(item);
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

	protected onShutdown(reason?: unknown): void {
		this.onCancelAll(reason);
	}

	private async dequeue(): Promise<PriorityQueuedTask | undefined> {
		while (!this.isShutdown()) {
			const item = this.pending.dequeue();
			if (item) {
				return item;
			}
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return undefined;
	}

	private async runWorker(): Promise<void> {
		while (!this.isShutdown()) {
			const item = await this.dequeue();
			if (!item || item.handle.isSettled) {
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
