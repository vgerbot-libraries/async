import { describe, expect, test } from "vitest";
import { Queue } from "../../src/common/Queue";

describe("Queue", () => {
	describe("enqueue and dequeue", () => {
		test("should enqueue and dequeue items in FIFO order", async () => {
			const queue = new Queue<number>();
			queue.enqueue(1);
			queue.enqueue(2);
			queue.enqueue(3);

			expect(await queue.dequeue()).toBe(1);
			expect(await queue.dequeue()).toBe(2);
			expect(await queue.dequeue()).toBe(3);
		});

		test("should handle single item", async () => {
			const queue = new Queue<string>();
			queue.enqueue("test");
			expect(await queue.dequeue()).toBe("test");
		});
	});

	describe("blocking behavior", () => {
		test("should block dequeue when queue is empty", async () => {
			const queue = new Queue<number>();
			let resolved = false;

			const dequeuePromise = queue.dequeue().then((value: number) => {
				resolved = true;
				return value;
			});

			await Promise.resolve();
			expect(resolved).toBe(false);

			queue.enqueue(42);
			expect(await dequeuePromise).toBe(42);
			expect(resolved).toBe(true);
		});

		test("should handle multiple waiting consumers", async () => {
			const queue = new Queue<number>();

			const promise1 = queue.dequeue();
			const promise2 = queue.dequeue();
			const promise3 = queue.dequeue();

			expect(queue.waitingCount).toBe(3);

			queue.enqueue(1);
			queue.enqueue(2);
			queue.enqueue(3);

			expect(await promise1).toBe(1);
			expect(await promise2).toBe(2);
			expect(await promise3).toBe(3);
		});
	});

	describe("size", () => {
		test("should return correct size", () => {
			const queue = new Queue<number>();
			expect(queue.size).toBe(0);

			queue.enqueue(1);
			expect(queue.size).toBe(1);

			queue.enqueue(2);
			queue.enqueue(3);
			expect(queue.size).toBe(3);
		});

		test("should decrease size after dequeue", async () => {
			const queue = new Queue<number>();
			queue.enqueue(1);
			queue.enqueue(2);
			expect(queue.size).toBe(2);

			await queue.dequeue();
			expect(queue.size).toBe(1);

			await queue.dequeue();
			expect(queue.size).toBe(0);
		});
	});

	describe("waitingCount", () => {
		test("should return number of waiting consumers", () => {
			const queue = new Queue<number>();
			expect(queue.waitingCount).toBe(0);

			queue.dequeue();
			expect(queue.waitingCount).toBe(1);

			queue.dequeue();
			queue.dequeue();
			expect(queue.waitingCount).toBe(3);
		});
	});

	describe("isEmpty", () => {
		test("should return true for empty queue", () => {
			const queue = new Queue<number>();
			expect(queue.isEmpty).toBe(true);
		});

		test("should return false for non-empty queue", () => {
			const queue = new Queue<number>();
			queue.enqueue(1);
			expect(queue.isEmpty).toBe(false);
		});
	});

	describe("clear", () => {
		test("should remove all items from queue", () => {
			const queue = new Queue<number>();
			queue.enqueue(1);
			queue.enqueue(2);
			queue.enqueue(3);

			queue.clear();

			expect(queue.size).toBe(0);
			expect(queue.isEmpty).toBe(true);
		});
	});

	describe("peek", () => {
		test("should return first item without removing it", () => {
			const queue = new Queue<number>();
			queue.enqueue(1);
			queue.enqueue(2);

			expect(queue.peek()).toBe(1);
			expect(queue.size).toBe(2);
			expect(queue.peek()).toBe(1);
		});

		test("should return undefined for empty queue", () => {
			const queue = new Queue<number>();
			expect(queue.peek()).toBeUndefined();
		});
	});
});
