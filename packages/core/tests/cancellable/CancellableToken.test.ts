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
