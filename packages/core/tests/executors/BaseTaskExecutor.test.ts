import { describe, expect, test } from "vitest";
import {
	CircuitBreakerExecutor,
	DebounceTaskExecutor,
	PoolTaskExecutor,
	PriorityPoolExecutor,
	RateLimitExecutor,
} from "../../src/executors";
import { ExecutorShutdownError } from "../../src/executors/ExecutorShutdownError";

describe("BaseTaskExecutor - Permanent Shutdown", () => {
	test("CircuitBreakerExecutor - permanent shutdown", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 3,
			resetTimeout: 1000,
		});

		executor.shutdown("test reason");
		expect(executor.isCancelled()).toBe(true);

		// First call should fail
		expect(() => executor.exec(async () => "test1")).toThrow(
			ExecutorShutdownError,
		);

		// Subsequent calls should also fail
		expect(() => executor.exec(async () => "test2")).toThrow(
			ExecutorShutdownError,
		);
	});

	test("RateLimitExecutor - permanent shutdown", () => {
		const executor = new RateLimitExecutor(10, 1000);

		executor.shutdown("test reason");
		expect(executor.isCancelled()).toBe(true);

		expect(() => executor.exec(async () => "test1")).toThrow(
			ExecutorShutdownError,
		);
		expect(() => executor.exec(async () => "test2")).toThrow(
			ExecutorShutdownError,
		);
	});

	test("DebounceTaskExecutor - permanent shutdown", () => {
		const executor = new DebounceTaskExecutor(100);

		executor.shutdown("test reason");
		expect(executor.isCancelled()).toBe(true);

		expect(() => executor.exec(async () => "test1")).toThrow(
			ExecutorShutdownError,
		);
		expect(() => executor.exec(async () => "test2")).toThrow(
			ExecutorShutdownError,
		);
	});

	test("PoolTaskExecutor - permanent shutdown", () => {
		const executor = new PoolTaskExecutor(2);

		executor.shutdown("test reason");
		expect(executor.isCancelled()).toBe(true);

		// Pool executors throw synchronously when shut down
		expect(() => executor.exec(async () => "test1")).toThrow(
			ExecutorShutdownError,
		);
		expect(() => executor.exec(async () => "test2")).toThrow(
			ExecutorShutdownError,
		);
	});

	test("PriorityPoolExecutor - permanent shutdown", () => {
		const executor = new PriorityPoolExecutor(2);

		executor.shutdown("test reason");
		expect(executor.isCancelled()).toBe(true);

		// Priority pool executors throw synchronously when shut down
		expect(() => executor.exec(async () => "test1")).toThrow(
			ExecutorShutdownError,
		);
		expect(() => executor.exec(async () => "test2", { priority: 10 })).toThrow(
			ExecutorShutdownError,
		);
	});

	test("shutdown reason is preserved", () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 3,
			resetTimeout: 1000,
		});

		const reason = { code: "USER_SHUTDOWN", message: "User requested stop" };
		executor.shutdown(reason);

		expect(() => executor.exec(async () => "test")).toThrow(
			ExecutorShutdownError,
		);
		try {
			executor.exec(async () => "test");
			expect.fail("Should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(ExecutorShutdownError);
			expect((error as ExecutorShutdownError).reason).toBe(reason);
		}
	});
});
