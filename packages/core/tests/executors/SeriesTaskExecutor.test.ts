import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable";
import { SeriesTaskExecutor } from "../../src/executors/SeriesTaskExecutor";

describe("SeriesTaskExecutor", () => {
	test("should execute tasks sequentially", async () => {
		const executor = new SeriesTaskExecutor();
		const order: number[] = [];

		const task1 = executor.exec(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
			order.push(1);
			return 1;
		});

		const task2 = executor.exec(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			order.push(2);
			return 2;
		});

		const task3 = executor.exec(async () => {
			order.push(3);
			return 3;
		});

		await Promise.all([task1, task2, task3]);
		expect(order).toEqual([1, 2, 3]);
	});

	test("should preserve execution order", async () => {
		const executor = new SeriesTaskExecutor();
		const results: number[] = [];

		const tasks = Array.from({ length: 5 }, (_, i) =>
			executor.exec(async () => {
				await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
				results.push(i);
				return i;
			}),
		);

		await Promise.all(tasks);
		expect(results).toEqual([0, 1, 2, 3, 4]);
	});

	test("should handle task errors", async () => {
		const executor = new SeriesTaskExecutor();

		const task1 = executor.exec(async () => {
			throw new Error("Task failed");
		});

		await expect(task1).rejects.toThrow("Task failed");
	});

	test("should continue after error", async () => {
		const executor = new SeriesTaskExecutor();

		const task1 = executor.exec(async () => {
			throw new Error("First failed");
		});

		const task2 = executor.exec(async () => {
			return 42;
		});

		await expect(task1).rejects.toThrow("First failed");
		await expect(task2).resolves.toBe(42);
	});

	test("should cancel pending tasks", async () => {
		const executor = new SeriesTaskExecutor();

		const task1 = executor.exec(async (token) => {
			await token.sleep(1000);
			return 1;
		});

		const task2 = executor.exec(async (token) => {
			await token.sleep(1000);
			return 2;
		});

		executor.cancel();

		await expect(task1).rejects.toBeInstanceOf(CancelError);
		await expect(task2).rejects.toBeInstanceOf(CancelError);
	});

	test("should report cancellation status", () => {
		const executor = new SeriesTaskExecutor();
		expect(executor.isCancelled()).toBe(false);

		executor.cancel();
		expect(executor.isCancelled()).toBe(true);
	});

	test("should handle single task", async () => {
		const executor = new SeriesTaskExecutor();

		const result = await executor.exec(async () => 42);

		expect(result).toBe(42);
	});

	test("should pass token to tasks", async () => {
		const executor = new SeriesTaskExecutor();

		await executor.exec(async (token) => {
			expect(token).toBeDefined();
			expect(token.signal).toBeInstanceOf(AbortSignal);
		});
	});
});
