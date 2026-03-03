import { describe, expect, test } from "vitest";
import { callbackify } from "../../src/utils/callbackify";

describe("callbackify", () => {
	test("converts promise function to callback style", (done) => {
		async function promiseFn(): Promise<string> {
			return "success";
		}

		const callbackFn = callbackify(promiseFn);
		callbackFn((err, result) => {
			expect(err).toBeNull();
			expect(result).toBe("success");
			done();
		});
	});

	test("handles errors", (done) => {
		async function promiseFn(): Promise<string> {
			throw new Error("test error");
		}

		const callbackFn = callbackify(promiseFn);
		callbackFn((err, result) => {
			expect(err).toBeInstanceOf(Error);
			expect(err?.message).toBe("test error");
			expect(result).toBeUndefined();
			done();
		});
	});

	test("works with single argument", (done) => {
		async function promiseFn(x: number): Promise<number> {
			return x * 2;
		}

		const callbackFn = callbackify(promiseFn);
		callbackFn(5, (err, result) => {
			expect(err).toBeNull();
			expect(result).toBe(10);
			done();
		});
	});

	test("works with multiple arguments", (done) => {
		async function promiseFn(a: number, b: number): Promise<number> {
			return a + b;
		}

		const callbackFn = callbackify(promiseFn);
		callbackFn(3, 7, (err, result) => {
			expect(err).toBeNull();
			expect(result).toBe(10);
			done();
		});
	});

	test("handles async operations", (done) => {
		async function promiseFn(): Promise<string> {
			await new Promise((resolve) => setTimeout(resolve, 10));
			return "async result";
		}

		const callbackFn = callbackify(promiseFn);
		callbackFn((err, result) => {
			expect(err).toBeNull();
			expect(result).toBe("async result");
			done();
		});
	});

	test("preserves result type", (done) => {
		async function promiseFn(): Promise<{ value: number }> {
			return { value: 42 };
		}

		const callbackFn = callbackify(promiseFn);
		callbackFn((err, result) => {
			expect(err).toBeNull();
			expect(result).toEqual({ value: 42 });
			done();
		});
	});
});
