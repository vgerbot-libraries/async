import { describe, expect, test } from "vitest";
import { CircuitBreakerExecutor } from "../../src/executors/CircuitBreakerExecutor";

describe("CircuitBreakerExecutor", () => {
	test("starts in CLOSED state", () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 3,
			resetTimeout: 1000,
		});

		expect(executor.getState()).toBe("CLOSED");
	});

	test("opens circuit after threshold failures", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 3,
			resetTimeout: 1000,
		});

		for (let i = 0; i < 3; i++) {
			try {
				await executor.exec(async () => {
					throw new Error("service error");
				});
			} catch (e) {
				// Expected
			}
		}

		expect(executor.getState()).toBe("OPEN");
	});

	test("fails fast when circuit is open", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 2,
			resetTimeout: 1000,
		});

		// Trigger failures to open circuit
		for (let i = 0; i < 2; i++) {
			try {
				await executor.exec(async () => {
					throw new Error("fail");
				});
			} catch (e) {
				// Expected
			}
		}

		expect(executor.getState()).toBe("OPEN");

		// Should fail immediately without executing task
		await expect(
			executor.exec(async () => "should not execute"),
		).rejects.toThrow("Circuit breaker is OPEN");
	});

	test("transitions to HALF_OPEN after reset timeout", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 2,
			resetTimeout: 100,
		});

		// Open circuit
		for (let i = 0; i < 2; i++) {
			try {
				await executor.exec(async () => {
					throw new Error("fail");
				});
			} catch (e) {
				// Expected
			}
		}

		expect(executor.getState()).toBe("OPEN");

		// Wait for reset timeout
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Next request should transition to HALF_OPEN
		try {
			await executor.exec(async () => "test");
		} catch (e) {
			// May fail, but state should change
		}

		expect(executor.getState()).not.toBe("OPEN");
	});

	test("closes circuit after successful requests in HALF_OPEN", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 2,
			resetTimeout: 100,
			halfOpenRequests: 2,
		});

		// Open circuit
		for (let i = 0; i < 2; i++) {
			try {
				await executor.exec(async () => {
					throw new Error("fail");
				});
			} catch (e) {
				// Expected
			}
		}

		// Wait for reset
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Successful requests in HALF_OPEN
		await executor.exec(async () => "success1");
		await executor.exec(async () => "success2");

		expect(executor.getState()).toBe("CLOSED");
	});

	test("reopens circuit on failure in HALF_OPEN", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 2,
			resetTimeout: 100,
		});

		// Open circuit
		for (let i = 0; i < 2; i++) {
			try {
				await executor.exec(async () => {
					throw new Error("fail");
				});
			} catch (e) {
				// Expected
			}
		}

		// Wait for reset
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Fail in HALF_OPEN
		try {
			await executor.exec(async () => {
				throw new Error("fail again");
			});
		} catch (e) {
			// Expected
		}

		expect(executor.getState()).toBe("OPEN");
	});

	test("reset method closes circuit", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 2,
			resetTimeout: 1000,
		});

		// Open circuit
		for (let i = 0; i < 2; i++) {
			try {
				await executor.exec(async () => {
					throw new Error("fail");
				});
			} catch (e) {
				// Expected
			}
		}

		expect(executor.getState()).toBe("OPEN");

		executor.reset();
		expect(executor.getState()).toBe("CLOSED");
	});

	test("can be cancelled", async () => {
		const executor = new CircuitBreakerExecutor({
			failureThreshold: 3,
			resetTimeout: 1000,
		});

		executor.cancel();

		expect(executor.isCancelled()).toBe(true);

		await expect(
			executor.exec(async () => "test"),
		).rejects.toThrow("Circuit breaker executor permanently cancelled");

		// Subsequent calls should also fail
		await expect(
			executor.exec(async () => "test2"),
		).rejects.toThrow("Circuit breaker executor permanently cancelled");
	});
});
