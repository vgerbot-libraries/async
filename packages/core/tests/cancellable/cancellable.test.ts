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

		test("should expose handle name", () => {
			const handle = cancellable(async () => 42, { name: "fetch-user" });
			expect(handle.name).toBe("fetch-user");
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

		test("should include task name in cancel message", async () => {
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ name: "fetch-user" },
			);
			handle.cancel("custom reason");
			await expect(handle.promise).rejects.toThrow("[fetch-user] cancelled");
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

		test("should handle already-aborted external signal", async () => {
			const externalController = new AbortController();
			externalController.abort("external cancel");
			const handle = cancellable(
				async (token) => {
					token.throwIfCancelled();
					return 42;
				},
				{ signal: externalController.signal },
			);
			await expect(handle.promise).rejects.toThrow(CancelError);
		});

		test("should include task name in timeout cancel message", async () => {
			vi.useFakeTimers();
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ name: "fetch-user", timeout: 10 },
			);
			const assertion = expect(handle.promise).rejects.toThrow(
				"[fetch-user] timeout after 10ms",
			);
			await vi.advanceTimersByTimeAsync(10);
			await assertion;
			vi.useRealTimers();
		});

		test("should call onCancel with CancelError", async () => {
			const onCancel = vi.fn();
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ onCancel },
			);
			handle.cancel("user cancelled");
			await expect(handle.promise).rejects.toThrow(CancelError);
			expect(onCancel).toHaveBeenCalledTimes(1);
			expect(onCancel.mock.calls[0]?.[0]).toBeInstanceOf(CancelError);
		});
	});

	describe("fallback", () => {
		test("should resolve with fallback value when cancelled", async () => {
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ fallback: 0 },
			);
			handle.cancel();
			await expect(handle.promise).resolves.toBe(0);
		});

		test("should resolve with function fallback and expose cancel state", async () => {
			const fallback = vi.fn(async (error: unknown, isCancelled: boolean) => {
				expect(error).toBeInstanceOf(CancelError);
				expect(isCancelled).toBe(true);
				return 7;
			});

			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ fallback },
			);
			handle.cancel();
			await expect(handle.promise).resolves.toBe(7);
			expect(fallback).toHaveBeenCalledTimes(1);
		});

		test("should resolve with promise fallback on non-cancel errors", async () => {
			const handle = cancellable(
				async () => {
					throw new Error("task error");
				},
				{ fallback: Promise.resolve(99) },
			);
			await expect(handle.promise).resolves.toBe(99);
		});

		test("should reject normally without fallback", async () => {
			const handle = cancellable(async (token) => {
				await token.sleep(1000);
				return 42;
			});
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

		test("should call onRetry with retry context", async () => {
			let attempts = 0;
			const onRetry = vi.fn();
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error(`retry me ${attempts}`);
					}
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: 100 }, onRetry },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100);
			await vi.advanceTimersByTimeAsync(100);
			await expect(promise).resolves.toBe(42);

			expect(onRetry).toHaveBeenCalledTimes(2);
			expect(onRetry).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					attempt: 1,
					maxAttempts: 3,
					waitMs: 100,
				}),
			);
			expect(onRetry).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					attempt: 2,
					maxAttempts: 3,
					waitMs: 100,
				}),
			);
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

		test("should preserve dual-stack diagnostics across nested wraps", async () => {
			const outerHandle = cancellable(async (token) => {
				const inner = cancellable(async (innerToken) => {
					await innerToken.sleep(1000);
					return 42;
				});
				return token.wrap(inner);
			});

			const reason = new Error("manual cancel");
			outerHandle.cancel(reason);

			try {
				await outerHandle.promise;
				expect.unreachable("expected nested handle to reject");
			} catch (error) {
				expect(error).toBeInstanceOf(CancelError);
				const cancelError = error as CancelError;
				const origin = cancelError.cause as CancelError;
				expect(origin).toBeInstanceOf(CancelError);
				expect(origin.cause).toBe(reason);
			}
		});

		test("should handle retry with fallback configured", async () => {
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
				{ retry: { maxAttempts: 3, delay: 100 }, fallback: 0 },
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
