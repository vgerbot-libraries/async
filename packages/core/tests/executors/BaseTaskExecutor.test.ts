import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable/CancelError";
import {
	CircuitBreakerExecutor,
	DebounceTaskExecutor,
	PoolTaskExecutor,
	PriorityPoolExecutor,
	RateLimitExecutor,
} from "../../src/executors";

describe("BaseTaskExecutor - Permanent Cancellation", () => {
	test("CircuitBreakerExecutor - permanent cancellation", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 3,
			resetTimeout: 1000,
		});

		executor.cancel("test reason");
		expect(executor.isCancelled()).toBe(true);

		// First call should fail
		await expect(executor.exec(async () => "test1")).rejects.toThrow(
			CancelError,
		);

		// Subsequent calls should also fail
		await expect(executor.exec(async () => "test2")).rejects.toThrow(
			CancelError,
		);
	});

	test("RateLimitExecutor - permanent cancellation", async () => {
		const executor = new RateLimitExecutor(10, 1000);

		executor.cancel("test reason");
		expect(executor.isCancelled()).toBe(true);

		await expect(executor.exec(async () => "test1")).rejects.toThrow(
			CancelError,
		);
		await expect(executor.exec(async () => "test2")).rejects.toThrow(
			CancelError,
		);
	});

	test("DebounceTaskExecutor - permanent cancellation", async () => {
		const executor = new DebounceTaskExecutor(100);

		executor.cancel("test reason");
		expect(executor.isCancelled()).toBe(true);

		expect(() => executor.exec(async () => "test1")).toThrow(CancelError);
		expect(() => executor.exec(async () => "test2")).toThrow(CancelError);
	});

	test("PoolTaskExecutor - permanent cancellation", async () => {
		const executor = new PoolTaskExecutor(2);

		executor.cancel("test reason");
		expect(executor.isCancelled()).toBe(true);

		// Pool executors throw synchronously when cancelled
		expect(() => executor.exec(async () => "test1")).toThrow(CancelError);
		expect(() => executor.exec(async () => "test2")).toThrow(CancelError);
	});

	test("PriorityPoolExecutor - permanent cancellation", async () => {
		const executor = new PriorityPoolExecutor(2);

		executor.cancel("test reason");
		expect(executor.isCancelled()).toBe(true);

		// Priority pool executors throw synchronously when cancelled
		expect(() => executor.exec(async () => "test1")).toThrow(CancelError);
		expect(() =>
			executor.execWithPriority(async () => "test2", 10),
		).toThrow(CancelError);
	});

	test("cancellation reason is preserved", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 3,
			resetTimeout: 1000,
		});

		const reason = { code: "USER_CANCELLED", message: "User requested stop" };
		executor.cancel(reason);

		try {
			await executor.exec(async () => "test");
			expect.fail("Should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(CancelError);
			expect((error as CancelError).reason).toBe(reason);
		}
	});
});
