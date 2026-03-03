import { describe, expect, test } from "vitest";
import { PriorityPoolExecutor } from "../../src/executors/PriorityPoolExecutor";

describe("PriorityPoolExecutor", () => {
	test("executes tasks by priority", async () => {
		const executor = new PriorityPoolExecutor(1);
		const order: string[] = [];

		const p1 = executor.execWithPriority(async (token) => {
			await token.sleep(50);
			order.push("low");
			return "low";
		}, 1);

		const p2 = executor.execWithPriority(async () => {
			order.push("high");
			return "high";
		}, 10);

		const p3 = executor.execWithPriority(async () => {
			order.push("medium");
			return "medium";
		}, 5);

		await Promise.all([p1, p2, p3]);
		expect(order).toEqual(["low", "high", "medium"]);
	});

	test("respects concurrency limit", async () => {
		const executor = new PriorityPoolExecutor(2);
		let running = 0;
		let maxRunning = 0;

		const promises = [];
		for (let i = 0; i < 5; i++) {
			promises.push(
				executor.exec(async (token) => {
					running++;
					maxRunning = Math.max(maxRunning, running);
					await token.sleep(50);
					running--;
					return i;
				}),
			);
		}

		await Promise.all(promises);
		expect(maxRunning).toBeLessThanOrEqual(2);
	});

	test("default priority is 0", async () => {
		const executor = new PriorityPoolExecutor(1);
		const order: string[] = [];

		executor.exec(async (token) => {
			await token.sleep(50);
			order.push("first");
		});

		executor.execWithPriority(async () => {
			order.push("high");
		}, 5);

		executor.exec(async () => {
			order.push("default");
		});

		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(order).toEqual(["first", "high", "default"]);
	});

	test("can be cancelled", async () => {
		const executor = new PriorityPoolExecutor(1);

		executor.exec(async (token) => {
			await token.sleep(100);
			return "first";
		});

		const p2 = executor.exec(async () => "second");
		const p3 = executor.exec(async () => "third");

		executor.cancel();

		await expect(p2).rejects.toThrow();
		await expect(p3).rejects.toThrow();
		expect(executor.isCancelled()).toBe(true);
	});

	test("handles errors without stopping", async () => {
		const executor = new PriorityPoolExecutor(1);

		const p1 = executor.exec(async () => {
			throw new Error("task error");
		});

		const p2 = executor.exec(async () => "success");

		await expect(p1).rejects.toThrow("task error");
		await expect(p2).resolves.toBe("success");
	});
});
