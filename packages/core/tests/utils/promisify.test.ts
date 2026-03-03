import { describe, expect, test } from "vitest";
import { promisify } from "../../src/utils/promisify";

describe("promisify", () => {
	test("converts callback function to promise", async () => {
		function callbackFn(callback: (err: Error | null, result?: string) => void) {
			setTimeout(() => callback(null, "success"), 10);
		}

		const promiseFn = promisify(callbackFn);
		await expect(promiseFn()).resolves.toBe("success");
	});

	test("handles errors", async () => {
		function callbackFn(callback: (err: Error | null, result?: string) => void) {
			setTimeout(() => callback(new Error("test error")), 10);
		}

		const promiseFn = promisify(callbackFn);
		await expect(promiseFn()).rejects.toThrow("test error");
	});

	test("works with single argument", async () => {
		function callbackFn(
			x: number,
			callback: (err: Error | null, result?: number) => void,
		) {
			setTimeout(() => callback(null, x * 2), 10);
		}

		const promiseFn = promisify(callbackFn);
		await expect(promiseFn(5)).resolves.toBe(10);
	});

	test("works with multiple arguments", async () => {
		function callbackFn(
			a: number,
			b: number,
			callback: (err: Error | null, result?: number) => void,
		) {
			setTimeout(() => callback(null, a + b), 10);
		}

		const promiseFn = promisify(callbackFn);
		await expect(promiseFn(3, 7)).resolves.toBe(10);
	});

	test("handles synchronous callbacks", async () => {
		function callbackFn(callback: (err: Error | null, result?: string) => void) {
			callback(null, "immediate");
		}

		const promiseFn = promisify(callbackFn);
		await expect(promiseFn()).resolves.toBe("immediate");
	});

	test("preserves result type", async () => {
		function callbackFn(callback: (err: Error | null, result?: { value: number }) => void) {
			callback(null, { value: 42 });
		}

		const promiseFn = promisify<{ value: number }>(callbackFn);
		const result = await promiseFn();
		expect(result).toEqual({ value: 42 });
	});
});
