import { describe, expect, test } from "vitest";
import { asyncify } from "../../src/utils/asyncify";

describe("asyncify", () => {
	test("converts sync function to async", async () => {
		const syncFn = (x: number) => x * 2;
		const asyncFn = asyncify(syncFn);
		const result = await asyncFn(5);
		expect(result).toBe(10);
	});

	test("handles multiple arguments", async () => {
		const syncFn = (a: number, b: number, c: number) => a + b + c;
		const asyncFn = asyncify(syncFn);
		const result = await asyncFn(1, 2, 3);
		expect(result).toBe(6);
	});

	test("handles functions that throw", async () => {
		const syncFn = () => {
			throw new Error("sync error");
		};
		const asyncFn = asyncify(syncFn);
		await expect(asyncFn().promise).rejects.toThrow("sync error");
	});

	test("respects fallback option", async () => {
		const syncFn = () => {
			throw new Error("error");
		};
		const asyncFn = asyncify(syncFn, { fallback: 42 });
		const result = await asyncFn();
		expect(result).toBe(42);
	});
});
