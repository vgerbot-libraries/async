import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	CancelError,
	CancellableHandle,
	CancellableToken,
	cancellable,
	type RetryOptions,
} from "../src/cancellable";

describe("CancelError", () => {
	test("should create a CancelError with message and reason", () => {
		const reason = "user cancelled";
		const error = new CancelError("Task canceled", reason);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("CancelError");
		expect(error.message).toBe("Task canceled");
		expect(error.reason).toBe(reason);
	});
});

describe("CancellableToken", () => {
	let abortController: AbortController;
	let token: CancellableToken;

	beforeEach(() => {
		abortController = new AbortController();
		token = new CancellableToken(abortController.signal);
	});

	describe("isCancelled", () => {
		test("should return false when not cancelled", () => {
			expect(token.isCancelled()).toBe(false);
		});

		test("should return true when cancelled", () => {
			abortController.abort();
			expect(token.isCancelled()).toBe(true);
		});
	});

	describe("throwIfCancelled", () => {
		test("should not throw when not cancelled", () => {
			expect(() => token.throwIfCancelled()).not.toThrow();
		});

		test("should throw CancelError when cancelled", () => {
			abortController.abort("test reason");
			expect(() => token.throwIfCancelled()).toThrow(CancelError);
		});
	});

	describe("wrap", () => {
		test("should resolve wrapped promise when not cancelled", async () => {
			const promise = Promise.resolve(42);
			const wrapped = token.wrap(promise);
			await expect(wrapped).resolves.toBe(42);
		});

		test("should reject wrapped promise when cancelled before resolution", async () => {
			const promise = new Promise((resolve) =>
				setTimeout(() => resolve(42), 100),
			);
			const wrapped = token.wrap(promise);
			abortController.abort("cancelled");
			await expect(wrapped).rejects.toThrow(CancelError);
		});

		test("should reject wrapped promise when already cancelled", async () => {
			abortController.abort("cancelled");
			const promise = Promise.resolve(42);
			const wrapped = token.wrap(promise);
			await expect(wrapped).rejects.toThrow(CancelError);
		});

		test("should propagate promise rejection", async () => {
			const error = new Error("test error");
			const promise = Promise.reject(error);
			const wrapped = token.wrap(promise);
			await expect(wrapped).rejects.toThrow("test error");
		});

		test("should wrap CancellableHandle and cancel it on abort", async () => {
			const innerHandle = cancellable(async (innerToken) => {
				await innerToken.sleep(1000);
				return 42;
			});
			const wrapped = token.wrap(innerHandle);
			abortController.abort("cancelled");
			await expect(wrapped).rejects.toThrow(CancelError);
			expect(innerHandle.isCancelled()).toBe(true);
		});
	});

	describe("sleep", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test("should resolve after specified delay", async () => {
			const sleepPromise = token.sleep(1000);
			vi.advanceTimersByTime(1000);
			await expect(sleepPromise).resolves.toBeUndefined();
		});

		test("should reject when cancelled during sleep", async () => {
			const sleepPromise = token.sleep(1000);
			vi.advanceTimersByTime(500);
			abortController.abort("cancelled");
			await expect(sleepPromise).rejects.toThrow(CancelError);
		});

		test("should reject immediately when already cancelled", async () => {
			abortController.abort("cancelled");
			const sleepPromise = token.sleep(1000);
			await expect(sleepPromise).rejects.toThrow(CancelError);
		});
	});

	describe("interval", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test("should execute function repeatedly at interval", async () => {
			const fn = vi.fn();
			const intervalPromise = token.interval(fn, 100);

			vi.advanceTimersByTime(100);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(100);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(2);

			abortController.abort();
			await expect(intervalPromise).rejects.toThrow(CancelError);
		});

		test("should handle async functions", async () => {
			const fn = vi.fn(async () => {
				await Promise.resolve();
			});
			const intervalPromise = token.interval(fn, 100);

			vi.advanceTimersByTime(100);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(1);

			abortController.abort();
			await expect(intervalPromise).rejects.toThrow(CancelError);
		});

		test("should stop when cancelled", async () => {
			const fn = vi.fn();
			const intervalPromise = token.interval(fn, 100);

			vi.advanceTimersByTime(100);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(1);

			abortController.abort();
			await expect(intervalPromise).rejects.toThrow(CancelError);

			vi.advanceTimersByTime(100);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(1); // Should not increase
		});
	});
});

describe("CancellableHandle", () => {
	test("should extend Defer", () => {
		const abortController = new AbortController();
		const handle = new CancellableHandle(abortController);
		expect(handle.promise).toBeInstanceOf(Promise);
	});

	test("should expose signal property", () => {
		const abortController = new AbortController();
		const handle = new CancellableHandle(abortController);
		expect(handle.signal).toBe(abortController.signal);
	});

	test("should check cancellation status", () => {
		const abortController = new AbortController();
		const handle = new CancellableHandle(abortController);
		expect(handle.isCancelled()).toBe(false);
		abortController.abort();
		expect(handle.isCancelled()).toBe(true);
	});

	test("should cancel with reason", () => {
		const abortController = new AbortController();
		const handle = new CancellableHandle(abortController);
		handle.cancel("test reason");
		expect(handle.isCancelled()).toBe(true);
		expect(handle.signal.reason).toBe("test reason");
	});
});

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
				expect(token).toBeInstanceOf(CancellableToken);
				expect(token.signal).toBeInstanceOf(AbortSignal);
				return 42;
			});
			await handle.promise;
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
				await handle.promise;
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
			const delayFn = vi.fn(
				(attempt: number, error: Error, backOff?: string) => {
					if (backOff === "linear") {
						return attempt * 100;
					}
					return 0;
				},
			);
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error("retry me");
					}
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: delayFn, backOff: "linear" } },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(100);
			await vi.advanceTimersByTimeAsync(200);
			await expect(promise).resolves.toBe(42);
		});

		test("should support exponential backoff", async () => {
			let attempts = 0;
			const delayFn = vi.fn(
				(attempt: number, error: Error, backOff?: string) => {
					if (backOff === "exponential") {
						return Math.pow(2, attempt) * 100;
					}
					return 0;
				},
			);
			const handle = cancellable(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error("retry me");
					}
					return 42;
				},
				{ retry: { maxAttempts: 3, delay: delayFn, backOff: "exponential" } },
			);

			const promise = handle.promise;
			await vi.advanceTimersByTimeAsync(200); // 2^1 * 100
			await vi.advanceTimersByTimeAsync(400); // 2^2 * 100
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
