import { describe, expect, test, vi } from "vitest";
import { CancelError } from "../../src/cancellable";
import { PoolTaskExecutor } from "../../src/executors/PoolTaskExecutor";

describe("PoolTaskExecutor", () => {
	test("should execute tasks with specified concurrency", async () => {
		const executor = new PoolTaskExecutor(2);
		const results: number[] = [];

		const task1 = executor.exec(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			results.push(1);
			return 1;
		});

		const task2 = executor.exec(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			results.push(2);
			return 2;
		});

		const task3 = executor.exec(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			results.push(3);
			return 3;
		});

		await Promise.all([task1, task2, task3]);
		expect(results).toEqual([1, 2, 3]);
	});

	test("should queue tasks when pool is full", async () => {
		const executor = new PoolTaskExecutor(1);
		const order: number[] = [];

		const task1 = executor.exec(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
			order.push(1);
			return 1;
		});

		const task2 = executor.exec(async () => {
			order.push(2);
			return 2;
		});

		await Promise.all([task1, task2]);
		expect(order).toEqual([1, 2]);
	});

	test("should handle task errors", async () => {
		const executor = new PoolTaskExecutor(2);

		const task = executor.exec(async () => {
			throw new Error("Task failed");
		});

		await expect(task).rejects.toThrow("Task failed");
	});

	test("should continue processing after error", async () => {
		const executor = new PoolTaskExecutor(1);

		const task1 = executor.exec(async () => {
			throw new Error("First task failed");
		});

		const task2 = executor.exec(async () => {
			return 42;
		});

		await expect(task1).rejects.toThrow("First task failed");
		await expect(task2).resolves.toBe(42);
	});

	test("should cancel all workers", async () => {
		const executor = new PoolTaskExecutor(2);

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
		expect(executor.isCancelled()).toBe(true);
	});

	test("should report cancellation status", () => {
		const executor = new PoolTaskExecutor(2);
		expect(executor.isCancelled()).toBe(false);

		executor.cancel();
		expect(executor.isCancelled()).toBe(true);
	});

	test("should handle multiple concurrent tasks", async () => {
		const executor = new PoolTaskExecutor(3);
		const tasks = Array.from({ length: 10 }, (_, i) =>
			executor.exec(async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return i;
			}),
		);

		const results = await Promise.all(tasks);
		expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	test("should pass token to tasks", async () => {
		const executor = new PoolTaskExecutor(1);
		const tokenSpy = vi.fn();

		await executor.exec(async (token) => {
			tokenSpy(token);
			expect(token).toBeDefined();
			expect(token.signal).toBeInstanceOf(AbortSignal);
		});

		expect(tokenSpy).toHaveBeenCalled();
	});
});
