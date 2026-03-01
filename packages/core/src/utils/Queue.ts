import { Defer } from "./Defer";

/**
 * An async queue implementation with blocking dequeue support.
 * When the queue is empty, dequeue operations will wait until an item is available.
 */
export class Queue<T> {
	private items: T[] = [];
	private waiters: Defer<T>[] = [];

	/**
	 * Adds an item to the end of the queue.
	 * If there are waiting consumers, the item is immediately delivered to the first waiter.
	 * @param item - The item to add to the queue
	 */
	enqueue(item: T): void {
		const waiter = this.waiters.shift();
		if (waiter) {
			// If there's a waiting consumer, deliver the item immediately
			waiter.resolve(item);
		} else {
			// Otherwise, add to the queue
			this.items.push(item);
		}
	}

	/**
	 * Removes and returns the first item from the queue.
	 * If the queue is empty, this method will wait until an item is available.
	 * @returns A promise that resolves to the first item in the queue
	 */
	async dequeue(): Promise<T> {
		const item = this.items.shift();
		if (item !== undefined) {
			return item;
		}

		// Queue is empty, create a deferred promise and wait
		const defer = new Defer<T>();
		this.waiters.push(defer);
		return defer.promise;
	}

	/**
	 * Returns the number of items currently in the queue.
	 * Note: This does not include waiting consumers.
	 */
	get size(): number {
		return this.items.length;
	}

	/**
	 * Returns the number of consumers waiting for items.
	 */
	get waitingCount(): number {
		return this.waiters.length;
	}

	/**
	 * Checks if the queue is empty.
	 */
	get isEmpty(): boolean {
		return this.items.length === 0;
	}

	/**
	 * Clears all items from the queue.
	 * Note: This does not affect waiting consumers.
	 */
	clear(): void {
		this.items = [];
	}

	/**
	 * Peeks at the first item in the queue without removing it.
	 * Returns undefined if the queue is empty.
	 */
	peek(): T | undefined {
		return this.items[0];
	}

	/**
	 * Removes and returns the first queued item immediately.
	 * Returns undefined if the queue is empty.
	 */
	dequeueNow(): T | undefined {
		return this.items.shift();
	}
}
