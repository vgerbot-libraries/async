import { describe, expect, test } from "vitest";
import { findIndex } from "../../src/collections/findIndex";

describe("findIndex", () => {
	test("finds index of first matching item", async () => {
		const handle = findIndex([1, 2, 3, 4], async (item) => item > 2);
		await expect(handle.promise).resolves.toBe(2);
	});

	test("returns -1 when no match", async () => {
		const handle = findIndex([1, 2, 3], async (item) => item > 10);
		await expect(handle.promise).resolves.toBe(-1);
	});

	test("works with concurrency", async () => {
		const handle = findIndex([1, 2, 3, 4, 5], async (item) => item === 3, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toBe(2);
	});

	test("returns 0 for first element match", async () => {
		const handle = findIndex([5, 2, 3], async (item) => item === 5);
		await expect(handle.promise).resolves.toBe(0);
	});

	test("handles empty array", async () => {
		const handle = findIndex([], async (item) => item > 0);
		await expect(handle.promise).resolves.toBe(-1);
	});
});
