import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CancelError } from "../../src/cancellable";
import { ThrottleTaskExecutor } from "../../src/executors/ThrottleTaskExecutor";

describe("ThrottleTaskExecutor", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("should throttle task execution", async () => {
		const executor = new ThrottleTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		executor.exec(taskFn);
		vi.advanceTimersByTime(100);

		executor.exec(taskFn);
		executor.exec(taskFn);

		vi.advanceTimersByTime(90);

		expect(taskFn).toHaveBeenCalledTimes(2);
	});

	test("should execute on leading edge by default", async () => {
		const executor = new ThrottleTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		const promise = executor.exec(taskFn);
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(1);
		await expect(promise.promise).resolves.toBe(42);
	});

	test("should execute on trailing edge by default", async () => {
		const executor = new ThrottleTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		executor.exec(taskFn);
		await vi.runAllTimersAsync();

		executor.exec(taskFn);
		vi.advanceTimersByTime(100);
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(2);
	});

	test("should disable leading edge when configured", async () => {
		const executor = new ThrottleTaskExecutor(100, { leading: false });
		const taskFn = vi.fn(async () => 42);

		executor.exec(taskFn);
		expect(taskFn).not.toHaveBeenCalled();
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(1);
	});

	test("should disable trailing edge when configured", async () => {
		const executor = new ThrottleTaskExecutor(100, { trailing: false });
		const taskFn = vi.fn(async () => {
			return 42;
		});

		executor.exec(taskFn);

		expect(taskFn).toHaveBeenCalledTimes(1);

		executor.exec(taskFn);
		vi.advanceTimersByTime(100);

		expect(taskFn).toHaveBeenCalledTimes(1);
	});

	test("should limit execution frequency", async () => {
		const executor = new ThrottleTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		for (let i = 0; i < 10; i++) {
			executor.exec(taskFn);
			vi.advanceTimersByTime(10);
		}

		await vi.runAllTimersAsync();

		// Should be called at most once per 100ms
		expect(taskFn.mock.calls.length).toBeLessThanOrEqual(2);
	});

	test("should cancel pending tasks", async () => {
		const executor = new ThrottleTaskExecutor(100);

		executor.exec(async () => 42);
		await vi.runAllTimersAsync();

		executor.cancel();

		expect(executor.isCancelled()).toBe(true);
	});

	test("should flush pending task immediately", async () => {
		const executor = new ThrottleTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		executor.exec(taskFn);
		executor.exec(taskFn);
		expect(taskFn).toHaveBeenCalledTimes(1);

		executor.flush();

		expect(taskFn).toHaveBeenCalledTimes(2);
	});

	test("should report pending status", () => {
		const executor = new ThrottleTaskExecutor(100);

		expect(executor.pending).toBe(false);

		executor.exec(async () => 42);

		expect(executor.pending).toBe(true);

		vi.advanceTimersByTime(100);

		expect(executor.pending).toBe(false);
	});

	test("should pass token to task", async () => {
		const executor = new ThrottleTaskExecutor(100);

		const promise = executor.exec(async (token) => {
			expect(token).toBeDefined();
			expect(token.signal).toBeInstanceOf(AbortSignal);
			return 42;
		});

		await vi.runAllTimersAsync();

		await expect(promise.promise).resolves.toBe(42);
	});

	test("should handle task errors", async () => {
		const executor = new ThrottleTaskExecutor(100);

		const promise = executor.exec(async () => {
			throw new Error("Task failed");
		});

		await vi.runAllTimersAsync();

		await expect(promise.promise).rejects.toThrow("Task failed");
	});

	test("should supersede pending tasks", async () => {
		const executor = new ThrottleTaskExecutor(100);

		executor.exec(async () => 1);
		await vi.advanceTimersByTimeAsync(10);

		const promise2 = executor.exec(async () => 2);
		const promise3 = executor.exec(async () => 3);

		await expect(promise2).rejects.toBeInstanceOf(CancelError);

		await vi.runAllTimersAsync();

		await expect(promise3.promise).resolves.toBe(3);
	});
});
