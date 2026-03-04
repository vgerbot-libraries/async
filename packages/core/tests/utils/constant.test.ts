import { describe, expect, test } from "vitest";
import { constant } from "../../src/utils/constant";

describe("constant", () => {
	test("returns constant value", async () => {
		const handle = constant(42);
		await expect(handle.promise).resolves.toBe(42);
	});

	test("works with objects", async () => {
		const obj = { a: 1, b: 2 };
		const handle = constant(obj);
		await expect(handle.promise).resolves.toBe(obj);
	});

	test("works with null and undefined", async () => {
		const nullHandle = constant(null);
		await expect(nullHandle.promise).resolves.toBeNull();

		const undefinedHandle = constant(undefined);
		await expect(undefinedHandle.promise).resolves.toBeUndefined();
	});

	test("respects timeout option", async () => {
		const handle = constant(42, { timeout: 100 });
		await expect(handle.promise).resolves.toBe(42);
	});
});
