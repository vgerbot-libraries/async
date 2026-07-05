import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableHandle } from "../cancellable/CancellableHandle";
import { cancellable } from "../cancellable/cancellable";
import { Defer } from "../utils/Defer";
import { BaseTaskExecutor } from "./BaseTaskExecutor";
import {
	matchesCancelRequest,
	NormalizedTaskCancelRequest,
	ResolvedTaskOptions,
	resolveTaskOptions,
	TaskOptions,
} from "./ITaskExecutor";

interface PriorityQueuedTask {
	task: AsyncTask<unknown>;
	defer: Defer<unknown>;
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
 * Note: Adds an optional `priority` parameter via `execWithPriority()`,
 * which is not part of the ITaskExecutor interface.
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
export class PriorityPoolExecutor extends BaseTaskExecutor {
	private readonly pending = new PriorityQueue<PriorityQueuedTask>();
	private readonly workers: CancellableHandle<void>[];

	constructor(concurrency: number) {
		super();
		this.workers = Array.from({ length: concurrency }, () =>
			cancellable(async (token) => {
				while (!this.isCancelled()) {
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

	exec<T>(task: AsyncTask<T>, options?: TaskOptions): Promise<T> {
		return this.execWithPriority(task, 0, options);
	}

	execWithPriority<T>(
		task: AsyncTask<T>,
		priority: number,
		options?: TaskOptions,
	): Promise<T> {
		this.checkCancelled("Priority pool executor permanently cancelled");

		const defer = new Defer<T>();
		this.pending.enqueue({
			task: task as AsyncTask<unknown>,
			defer: defer as Defer<unknown>,
			priority,
			options: resolveTaskOptions(options),
		});

		return defer.promise;
	}

	protected onCancel(reason?: unknown): void {
		for (const handle of this.workers) {
			handle.cancel(reason);
		}
		for (const item of this.pending.clear()) {
			item.defer.reject(
				CancelError.fromReason("Priority pool executor cancelled", reason),
			);
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
				item.defer.reject(
					CancelError.fromReason("Task cancelled", request.reason),
				);
				continue;
			}
			retained.push(item);
		}

		for (const item of retained) {
			this.pending.enqueue(item);
		}

		if (cancelled === 0) {
			super.cancelFiltered(request);
		}
	}

	private async dequeue(): Promise<PriorityQueuedTask | undefined> {
		while (!this.isCancelled()) {
			const item = this.pending.dequeue();
			if (item) {
				return item;
			}
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return undefined;
	}
}
