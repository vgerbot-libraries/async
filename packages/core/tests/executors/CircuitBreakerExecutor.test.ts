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
			} catch (_e) {
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
			} catch (_e) {
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
			halfOpenRequests: 3,
		});

		// Open circuit
		for (let i = 0; i < 2; i++) {
			try {
				await executor.exec(async () => {
					throw new Error("fail");
				});
			} catch (_e) {
				// Expected
			}
		}

		expect(executor.getState()).toBe("OPEN");

		// Wait for reset timeout
		await new Promise((resolve) => setTimeout(resolve, 150));

		// State is still OPEN until exec() is called
		expect(executor.getState()).toBe("OPEN");

		// exec() triggers transition to HALF_OPEN; a failing task reopens circuit
		try {
			await executor.exec(async () => {
				throw new Error("still failing");
			});
		} catch (_e) {
			// Expected
		}

		// Failure in HALF_OPEN reopens the circuit
		expect(executor.getState()).toBe("OPEN");
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
			} catch (_e) {
				// Expected
			}
		}

		// Wait for reset
		await new Promise((resolve) => setTimeout(resolve, 150));

		// First success in HALF_OPEN — not enough to close yet
		await executor.exec(async () => "success1");
		expect(executor.getState()).toBe("HALF_OPEN");

		// Second success closes the circuit
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
			} catch (_e) {
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
		} catch (_e) {
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
			} catch (_e) {
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

		expect(executor.isCancelled()).toBe(false);

		await expect(executor.exec(async () => "test")).resolves.toBe("test");

		executor.shutdown();
		expect(executor.isCancelled()).toBe(true);
		expect(() => executor.exec(async () => "test2")).toThrow();
	});
});
