import { describe, expect, test } from "vitest";
import { priorityQueue } from "../../src/control-flow/priorityQueue";

describe("priorityQueue", () => {
	test("processes tasks by priority", async () => {
		const order: string[] = [];
		const q = priorityQueue(
			async (task: string) => {
				order.push(task);
				return task;
			},
			{ concurrency: 1 },
		);

		// Pause to prevent immediate execution
		q.pause();
		q.push("low", 1);
		q.push("high", 10);
		q.push("medium", 5);
		q.resume();

		await q.onIdle();
		expect(order).toEqual(["high", "medium", "low"]);
	});

	test("default priority is 0", async () => {
		const order: string[] = [];
		const q = priorityQueue(
			async (task: string) => {
				order.push(task);
				return task;
			},
			{ concurrency: 1 },
		);

		q.pause();
		q.push("a");
		q.push("b", 5);
		q.push("c");
		q.resume();

		await q.onIdle();
		expect(order).toEqual(["b", "a", "c"]);
	});

	test("handles concurrent execution", async () => {
		let running = 0;
		let maxRunning = 0;
		const q = priorityQueue(
			async (task: number, token) => {
				running++;
				maxRunning = Math.max(maxRunning, running);
				await token.sleep(50);
				running--;
				return task;
			},
			{ concurrency: 3 },
		);

		const promises = [
			q.push(1, 1),
			q.push(2, 2),
			q.push(3, 3),
			q.push(4, 4),
			q.push(5, 5),
		];

		await Promise.all(promises);
		expect(maxRunning).toBeLessThanOrEqual(3);
	});

	test("pushMany with priority", async () => {
		const order: string[] = [];
		const q = priorityQueue(
			async (task: string) => {
				order.push(task);
				return task;
			},
			{ concurrency: 1 },
		);

		q.pause();
		q.pushMany(["a", "b"], 1);
		q.push("high", 10);
		q.pushMany(["c", "d"], 5);
		q.resume();

		await q.onIdle();
		expect(order[0]).toBe("high");
	});

	test("pause and resume", async () => {
		let count = 0;
		const q = priorityQueue(
			async (task: number) => {
				count++;
				return task;
			},
			{ concurrency: 1 },
		);

		q.pause();
		q.push(1);
		q.push(2);

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(count).toBe(0);

		q.resume();
		await q.onIdle();
		expect(count).toBe(2);
	});

	test("cancel rejects pending tasks", async () => {
		const q = priorityQueue(
			async (task: number, token) => {
				await token.sleep(100);
				return task;
			},
			{ concurrency: 1 },
		);

		const p1 = q.push(1);
		const p2 = q.push(2);
		const p3 = q.push(3);

		q.cancel();

		await expect(p2).rejects.toThrow();
		await expect(p3).rejects.toThrow();
	});

	test("length and running properties", async () => {
		const q = priorityQueue(
			async (task: number, token) => {
				await token.sleep(50);
				return task;
			},
			{ concurrency: 2 },
		);

		q.push(1);
		q.push(2);
		q.push(3);
		q.push(4);

		expect(q.length).toBeGreaterThan(0);
		expect(q.running).toBeGreaterThan(0);

		await q.onIdle();
		expect(q.length).toBe(0);
		expect(q.running).toBe(0);
		expect(q.idle).toBe(true);
	});
});
