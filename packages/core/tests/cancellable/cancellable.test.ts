import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	CancelError,
	CancellableHandle,
	cancellable,
} from "../../src/cancellable";

describe("cancellable", () => {
	describe("basic functionality", () => {
		test("should execute async task and resolve", async () => {
			const handle = cancellable(async () => {
				return 42;
			});
			await expect(handle.promise).resolves.toBe(42);
		});

		test("should return CancellableHandle", () => {
			const handle = cancellable(async () => 42);
			expect(handle).toBeInstanceOf(CancellableHandle);
		});

		test("should provide token to task", async () => {
			const handle = cancellable(async (token) => {
				expect(token).toBeDefined();
				expect(token.signal).toBeInstanceOf(AbortSignal);
				return 42;
			});
			await handle;
		});

		test("should reject when task throws", async () => {
			const handle = cancellable(async () => {
				throw new Error("task error");
			});
			await expect(handle.promise).rejects.toThrow("task error");
		});
	});

	describe("cancellation", () => {
		test("should cancel task", async () => {
			const handle = cancellable(async (token) => {
				await token.sleep(1000);
				return 42;
			});
			handle.cancel("user cancelled");
			await expect(handle.promise).rejects.toThrow(CancelError);
		});

		test("should cancel with custom reason", async () => {
			const handle = cancellable(async (token) => {
				await token.sleep(1000);
				return 42;
			});
			handle.cancel("custom reason");
			try {
				await handle;
			} catch (error) {
				expect(error).toBeInstanceOf(CancelError);
				expect((error as CancelError).reason).toBe("custom reason");
			}
		});

		test("should respect external signal", async () => {
			const externalController = new AbortController();
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ signal: externalController.signal },
			);
			externalController.abort("external cancel");
			await expect(handle.promise).rejects.toThrow(CancelError);
		});
	});

	describe("silent mode", () => {
		test("should resolve with undefined when cancelled in silent mode", async () => {
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ silent: true },
			);
			handle.cancel();
			await expect(handle.promise).resolves.toBeUndefined();
		});

		test("should still reject on non-cancel errors in silent mode", async () => {
			const handle = cancellable(
				async () => {
					throw new Error("task error");
				},
				{ silent: true },
			);
			await expect(handle.promise).rejects.toThrow("task error");
		});

		test("should reject normally when silent is false", async () => {
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ silent: false },
			);
			handle.cancel();
			await expect(handle.promise).rejects.toThrow(CancelError);
		});
	});

	describe("retry functionality", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test("should retry on failure", async () => {
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error("retry me");
					}
					return 42;
				},
				{ retry: { maxAttempts: 3 } },
			);
			await expect(handle.promise).resolves.toBe(42);
			expect(attempts).toBe(3);
		});

		test("should fail after max attempts", async () => {
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					throw new Error("always fails");
				},
				{ retry: { maxAttempts: 3 } },
			);
			await expect(handle.promise).rejects.toThrow("always fails");
			expect(attempts).toBe(3);
		});

		test("should use fixed delay between retries", async () => {
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error("retry me");
					}
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: 100 } },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100);
			await vi.advanceTimersByTimeAsync(100);
			await expect(promise).resolves.toBe(42);
		});

		test("should use custom delay function", async () => {
			let attempts = 0;
			const delayFn = vi.fn((attempt: number) => attempt * 100);
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error("retry me");
					}
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: delayFn } },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100); // First retry delay
			await vi.advanceTimersByTimeAsync(200); // Second retry delay
			await expect(promise).resolves.toBe(42);
			expect(delayFn).toHaveBeenCalledTimes(2);
		});

		test("should respect retryIf predicate", async () => {
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					throw new Error(attempts === 1 ? "retryable" : "fatal");
				},
				{
					retry: {
						maxAttempts: 3,
						retryIf: (error) => error.message === "retryable",
					},
				},
			);
			await expect(handle.promise).rejects.toThrow("fatal");
			expect(attempts).toBe(2);
		});

		test("should not retry on CancelError", async () => {
			let attempts = 0;
			const handle = cancellable(
				async (token) => {
					attempts++;
					token.throwIfCancelled();
					throw new Error("should retry");
				},
				{ retry: { maxAttempts: 3 } },
			);
			handle.cancel();
			await expect(handle.promise).rejects.toThrow(CancelError);
			expect(attempts).toBe(1);
		});

		test("should support linear backoff", async () => {
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error("retry me");
					}
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: 100, backOff: "linear" } },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100); // 100 * 1
			await vi.advanceTimersByTimeAsync(200); // 100 * 2
			await expect(promise).resolves.toBe(42);
		});

		test("should support exponential backoff", async () => {
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error("retry me");
					}
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: 100, backOff: "exponential" } },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(200); // 100 * 2^1
			await vi.advanceTimersByTimeAsync(400); // 100 * 2^2
			await expect(promise).resolves.toBe(42);
		});

		test("should cancel during retry delay", async () => {
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					throw new Error("retry me");
				},
				{ retry: { maxAttempts: 3, delay: 1000 } },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(500);
			handle.cancel();
			await expect(promise).rejects.toThrow(CancelError);
			expect(attempts).toBe(1);
		});
	});

	describe("integration scenarios", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test("should handle complex async operations", async () => {
			const handle = cancellable(async (token) => {
				await token.sleep(100);
				const result = await token.wrap(Promise.resolve(21));
				await token.sleep(100);
				return result * 2;
			});

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100);
			await vi.advanceTimersByTimeAsync(100);
			await expect(promise).resolves.toBe(42);
		});

		test("should handle nested cancellable tasks", async () => {
			const innerHandle = cancellable(async (token) => {
				await token.sleep(1000);
				return 42;
			});

			const outerHandle = cancellable(async (token) => {
				return await token.wrap(innerHandle);
			});

			outerHandle.cancel();
			await expect(outerHandle.promise).rejects.toThrow(CancelError);
			expect(innerHandle.isCancelled()).toBe(true);
		});

		test("should handle retry with silent mode", async () => {
			let attempts = 0;
			const handle = cancellable(
				async (token) => {
					attempts++;
					if (attempts < 2) {
						throw new Error("retry me");
					}
					await token.sleep(100);
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: 100 }, silent: true },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100); // Retry delay
			await vi.advanceTimersByTimeAsync(100); // Sleep in successful attempt
			await expect(promise).resolves.toBe(42);
		});

		test("should handle external signal with retry", async () => {
			const externalController = new AbortController();
			let attempts = 0;
			const handle = cancellable(
				async () => {
					attempts++;
					throw new Error("retry me");
				},
				{
					signal: externalController.signal,
					retry: { maxAttempts: 5, delay: 100 },
				},
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100);
			externalController.abort("external cancel");
			await expect(promise).rejects.toThrow(CancelError);
			expect(attempts).toBeLessThan(5);
		});
	});
});
