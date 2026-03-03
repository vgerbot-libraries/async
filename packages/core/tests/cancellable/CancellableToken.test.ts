import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	CancelError,
	CancellableToken,
	cancellable,
} from "../../src/cancellable";

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

		test("should expose token name", () => {
			const namedToken = new CancellableToken(
				abortController.signal,
				"worker-1",
			);
			expect(namedToken.name).toBe("worker-1");
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

		test("should include token name in cancel message", () => {
			const namedToken = new CancellableToken(
				abortController.signal,
				"worker-1",
			);
			abortController.abort("test reason");
			expect(() => namedToken.throwIfCancelled()).toThrow(
				"[worker-1] cancelled",
			);
		});

		test("should chain cause through rejection site", () => {
			const reason = new Error("cancel origin");
			abortController.abort(reason);
			try {
				token.throwIfCancelled();
				expect.unreachable("expected throwIfCancelled to throw");
			} catch (error) {
				expect(error).toBeInstanceOf(CancelError);
				const cancelError = error as CancelError;
				expect(cancelError.reason).toBe(reason);
				const origin = cancelError.cause as CancelError;
				expect(origin).toBeInstanceOf(CancelError);
				expect(origin.cause).toBe(reason);
			}
		});

		test("should handle cancellation with no reason", () => {
			abortController.abort();
			expect(() => token.throwIfCancelled()).toThrow(CancelError);
			try {
				token.throwIfCancelled();
			} catch (error) {
				expect(error).toBeInstanceOf(CancelError);
				const cancelError = error as CancelError;
				expect(cancelError.message).toContain("cancelled");
			}
		});

		test("should handle Error reason with message", () => {
			const reason = new Error("custom error message");
			abortController.abort(reason);
			try {
				token.throwIfCancelled();
			} catch (error) {
				expect(error).toBeInstanceOf(CancelError);
				const cancelError = error as CancelError;
				expect(cancelError.message).toContain("custom error message");
			}
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

		test("should chain cause through wrapped rejection", async () => {
			const reason = new Error("cancel origin");
			const promise = new Promise((resolve) => setTimeout(resolve, 50));
			const wrapped = token.wrap(promise);
			abortController.abort(reason);
			try {
				await wrapped;
				expect.unreachable("expected wrapped promise to reject");
			} catch (error) {
				expect(error).toBeInstanceOf(CancelError);
				const cancelError = error as CancelError;
				expect(cancelError.reason).toBe(reason);
				const origin = cancelError.cause as CancelError;
				expect(origin).toBeInstanceOf(CancelError);
				expect(origin.cause).toBe(reason);
			}
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

		async function flushMicrotasks() {
			for (let i = 0; i < 10; i++) await Promise.resolve();
		}

		test("should execute function repeatedly at interval", async () => {
			const fn = vi.fn();
			const intervalPromise = token.interval(fn, 100);

			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(100);
			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(2);

			vi.advanceTimersByTime(100);
			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(3);

			abortController.abort();
			await expect(intervalPromise).rejects.toThrow(CancelError);
		});

		test("should handle async functions", async () => {
			const fn = vi.fn(async () => {
				await Promise.resolve();
			});
			const intervalPromise = token.interval(fn, 100);

			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(100);
			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(2);

			abortController.abort();
			await expect(intervalPromise).rejects.toThrow(CancelError);
		});

		test("should stop when cancelled", async () => {
			const fn = vi.fn();
			const intervalPromise = token.interval(fn, 100);

			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1);

			abortController.abort();
			await expect(intervalPromise).rejects.toThrow(CancelError);

			vi.advanceTimersByTime(100);
			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1); // Should not increase
		});
	});

	describe("construction", () => {
		test("should initialize cancel error for already-aborted signal", () => {
			const alreadyAborted = new AbortController();
			alreadyAborted.abort("done");
			const immediateToken = new CancellableToken(alreadyAborted.signal);
			expect(() => immediateToken.throwIfCancelled()).toThrow(CancelError);
		});
	});

	describe("retryAttempt", () => {
		test("should return retry attempt number", () => {
			expect(token.retryAttempt).toBe(0);
		});
	});

	describe("frame", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test("should resolve on next animation frame", async () => {
			const framePromise = token.frame();
			vi.advanceTimersByTime(16); // ~1 frame at 60fps
			await expect(framePromise).resolves.toBeUndefined();
		});

		test("should reject when cancelled during frame wait", async () => {
			const framePromise = token.frame();
			abortController.abort("cancelled");
			await expect(framePromise).rejects.toThrow(CancelError);
		});

		test("should reject immediately when already cancelled", async () => {
			abortController.abort("cancelled");
			const framePromise = token.frame();
			await expect(framePromise).rejects.toThrow(CancelError);
		});

		test("should use requestAnimationFrame when available", async () => {
			// Mock requestAnimationFrame
			const originalRAF = global.requestAnimationFrame;
			const originalCAF = global.cancelAnimationFrame;
			const rafMock = vi.fn((cb: FrameRequestCallback) => {
				setTimeout(() => cb(0), 16);
				return 1;
			});
			const cafMock = vi.fn();
			global.requestAnimationFrame =
				rafMock as unknown as typeof requestAnimationFrame;
			global.cancelAnimationFrame = cafMock;

			const framePromise = token.frame();
			expect(rafMock).toHaveBeenCalled();

			vi.advanceTimersByTime(16);
			await expect(framePromise).resolves.toBeUndefined();

			global.requestAnimationFrame = originalRAF;
			global.cancelAnimationFrame = originalCAF;
		});

		test("should cancel requestAnimationFrame when cancelled", async () => {
			const originalRAF = global.requestAnimationFrame;
			const originalCAF = global.cancelAnimationFrame;
			const rafMock = vi.fn(() => 123);
			const cafMock = vi.fn();
			global.requestAnimationFrame =
				rafMock as unknown as typeof requestAnimationFrame;
			global.cancelAnimationFrame = cafMock;

			const frameHandle = token.frame();
			frameHandle.cancel();

			await expect(frameHandle.promise).rejects.toThrow(CancelError);
			expect(cafMock).toHaveBeenCalledWith(123);

			global.requestAnimationFrame = originalRAF;
			global.cancelAnimationFrame = originalCAF;
		});
	});

	describe("onCancel", () => {
		test("should call callback when cancelled", () => {
			const callback = vi.fn();
			token.onCancel(callback);
			abortController.abort("test reason");
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(expect.any(CancelError));
		});

		test("should call callback immediately if already cancelled", () => {
			abortController.abort("test reason");
			const callback = vi.fn();
			token.onCancel(callback);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test("should allow unsubscribing", () => {
			const callback = vi.fn();
			const unsubscribe = token.onCancel(callback);
			unsubscribe();
			abortController.abort("test reason");
			expect(callback).not.toHaveBeenCalled();
		});

		test("should handle unsubscribe when already cancelled", () => {
			abortController.abort("test reason");
			const callback = vi.fn();
			const unsubscribe = token.onCancel(callback);
			expect(callback).toHaveBeenCalledTimes(1);
			unsubscribe(); // Should not throw
		});
	});

	describe("wrap - edge cases", () => {
		test("should reject if promise resolves after cancellation", async () => {
			let resolvePromise: (value: number) => void;
			const promise = new Promise<number>((resolve) => {
				resolvePromise = resolve;
			});
			const wrapped = token.wrap(promise);

			abortController.abort("cancelled");
			resolvePromise!(42);

			await expect(wrapped).rejects.toThrow(CancelError);
		});
	});

	describe("delay", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test("should resolve when schedule completes", async () => {
			const delayPromise = token.delay((done) => {
				const timer = setTimeout(done, 100);
				return () => clearTimeout(timer);
			});
			vi.advanceTimersByTime(100);
			await expect(delayPromise).resolves.toBeUndefined();
		});

		test("should reject when parent token is cancelled during delay", async () => {
			const delayPromise = token.delay((done) => {
				const timer = setTimeout(done, 100);
				return () => clearTimeout(timer);
			});
			vi.advanceTimersByTime(50);
			abortController.abort("cancelled");
			await expect(delayPromise).rejects.toThrow(CancelError);
		});

		test("should reject when delay handle is cancelled", async () => {
			const delayHandle = token.delay((done) => {
				const timer = setTimeout(done, 100);
				return () => clearTimeout(timer);
			});
			vi.advanceTimersByTime(50);
			delayHandle.cancel();
			await expect(delayHandle.promise).rejects.toThrow(CancelError);
		});

		test("should reject immediately when parent token already cancelled", async () => {
			abortController.abort("cancelled");
			const delayPromise = token.delay((done) => {
				const timer = setTimeout(done, 100);
				return () => clearTimeout(timer);
			});
			await expect(delayPromise).rejects.toThrow(CancelError);
		});

		test("should handle parent cancellation after schedule completes", async () => {
			const delayPromise = token.delay((done) => {
				const timer = setTimeout(() => {
					abortController.abort("cancelled");
					done();
				}, 100);
				return () => clearTimeout(timer);
			});
			vi.advanceTimersByTime(100);
			await expect(delayPromise).rejects.toThrow(CancelError);
		});
	});

	describe("interval - edge cases", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		async function flushMicrotasks() {
			for (let i = 0; i < 10; i++) await Promise.resolve();
		}

		test("should stop when handle is cancelled", async () => {
			const fn = vi.fn();
			const intervalHandle = token.interval(fn, 100);

			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1);

			intervalHandle.cancel();

			// Don't await the promise, just check it rejects
			intervalHandle.promise.catch(() => {
				// Intentionally empty - just preventing unhandled rejection
			});

			vi.advanceTimersByTime(100);
			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1); // Should not increase
		});

		test("should handle function throwing non-CancelError", async () => {
			const error = new Error("test error");
			const fn = vi.fn(() => {
				throw error;
			});
			const intervalPromise = token.interval(fn, 100);

			await flushMicrotasks();
			await expect(intervalPromise).rejects.toThrow(CancelError);
		});

		test("should handle async function throwing error", async () => {
			const error = new Error("async error");
			const fn = vi.fn(async () => {
				throw error;
			});
			const intervalPromise = token.interval(fn, 100);

			await flushMicrotasks();
			await expect(intervalPromise).rejects.toThrow(CancelError);
		});

		test("should use cancelError when parent token cancelled", async () => {
			const fn = vi.fn();
			const intervalPromise = token.interval(fn, 100);

			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1);

			abortController.abort("parent cancelled");
			await expect(intervalPromise).rejects.toThrow(CancelError);
		});

		test("should break on cancellation check after function execution", async () => {
			let callCount = 0;
			const fn = vi.fn(async () => {
				callCount++;
				if (callCount === 2) {
					abortController.abort("cancelled during execution");
				}
			});
			const intervalPromise = token.interval(fn, 100);

			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(100);
			await flushMicrotasks();
			expect(fn).toHaveBeenCalledTimes(2);

			await expect(intervalPromise).rejects.toThrow(CancelError);
		});
	});
});
