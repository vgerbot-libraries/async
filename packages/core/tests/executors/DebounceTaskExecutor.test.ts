import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CancelError } from "../../src/cancellable";
import { DebounceTaskExecutor } from "../../src/executors/DebounceTaskExecutor";

describe("DebounceTaskExecutor", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("should debounce task execution", async () => {
		const executor = new DebounceTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		executor.exec(taskFn);
		executor.exec(taskFn);
		executor.exec(taskFn);

		expect(taskFn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(1);
	});

	test("should execute on leading edge when enabled", async () => {
		const executor = new DebounceTaskExecutor(100, {
			leading: true,
			trailing: false,
		});
		const taskFn = vi.fn(async () => 42);

		const promise = executor.exec(taskFn);

		await vi.runAllTimersAsync();
		expect(taskFn).toHaveBeenCalledTimes(1);
		await expect(promise.promise).resolves.toBe(42);
	});

	test("should execute on trailing edge by default", async () => {
		const executor = new DebounceTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		const promise = executor.exec(taskFn);

		expect(taskFn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(1);
		await expect(promise.promise).resolves.toBe(42);
	});

	test("should supersede pending tasks", async () => {
		const executor = new DebounceTaskExecutor(100);

		const promise1 = executor.exec(async () => 1);
		const promise2 = executor.exec(async () => 2);
		const promise3 = executor.exec(async () => 3);

		await expect(promise1.promise).rejects.toBeInstanceOf(CancelError);
		await expect(promise2.promise).rejects.toBeInstanceOf(CancelError);

		vi.advanceTimersByTime(100);
		await vi.runAllTimersAsync();

		await expect(promise3.promise).resolves.toBe(3);
	});

	test("should respect maxWait option", async () => {
		const executor = new DebounceTaskExecutor(100, { maxWait: 200 });
		const taskFn = vi.fn(async () => 42);

		executor.exec(taskFn);
		vi.advanceTimersByTime(50);

		executor.exec(taskFn);
		vi.advanceTimersByTime(50);

		executor.exec(taskFn);
		vi.advanceTimersByTime(50);

		executor.exec(taskFn);
		vi.advanceTimersByTime(50);

		await vi.runAllTimersAsync();

		// Should have been invoked due to maxWait
		expect(taskFn).toHaveBeenCalled();
	});

	test("should cancel pending tasks", async () => {
		const executor = new DebounceTaskExecutor(100);

		const promise = executor.exec(async () => 42);

		executor.cancel();

		await expect(promise.promise).rejects.toBeInstanceOf(CancelError);
		expect(executor.isCancelled()).toBe(true);
	});

	test("should flush pending task immediately", async () => {
		const executor = new DebounceTaskExecutor(100);
		const taskFn = vi.fn(async () => 42);

		const promise = executor.exec(taskFn);

		expect(taskFn).not.toHaveBeenCalled();

		executor.flush();
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(1);
		await expect(promise.promise).resolves.toBe(42);
	});

	test("should report pending status", () => {
		const executor = new DebounceTaskExecutor(100);

		expect(executor.pending).toBe(false);

		executor.exec(async () => 42);

		expect(executor.pending).toBe(true);

		vi.advanceTimersByTime(100);

		expect(executor.pending).toBe(false);
	});

	test("should handle both leading and trailing", async () => {
		const executor = new DebounceTaskExecutor(100, {
			leading: true,
			trailing: true,
		});
		const taskFn = vi.fn(async () => 42);

		executor.exec(taskFn);
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(1);

		executor.exec(taskFn);
		vi.advanceTimersByTime(100);
		await vi.runAllTimersAsync();

		expect(taskFn).toHaveBeenCalledTimes(2);
	});

	test("should pass token to task", async () => {
		const executor = new DebounceTaskExecutor(100);

		const promise = executor.exec(async (token) => {
			expect(token).toBeDefined();
			expect(token.signal).toBeInstanceOf(AbortSignal);
			return 42;
		});

		vi.advanceTimersByTime(100);
		await vi.runAllTimersAsync();

		await expect(promise.promise).resolves.toBe(42);
	});

	test("should handle task errors", async () => {
		const executor = new DebounceTaskExecutor(100);

		const promise = executor.exec(async () => {
			throw new Error("Task failed");
		});

		vi.advanceTimersByTime(100);
		await vi.runAllTimersAsync();

		await expect(promise.promise).rejects.toThrow("Task failed");
	});
});
