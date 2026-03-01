import { describe, expect, test } from "vitest";
import { CancellableHandle } from "../../src/cancellable";

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
