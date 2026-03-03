import { describe, expect, test } from "vitest";
import { find } from "../../src/collections/find";

describe("find", () => {
	test("finds first matching item", async () => {
		const handle = find(
			[1, 2, 3, 4],
			async (item) => item > 2,
		);
		await expect(handle.promise).resolves.toBe(3);
	});

	test("returns undefined when no match", async () => {
		const handle = find(
			[1, 2, 3],
			async (item) => item > 10,
		);
		await expect(handle.promise).resolves.toBeUndefined();
	});

	test("works with concurrency", async () => {
		const handle = find(
			[1, 2, 3, 4, 5],
			async (item) => item === 3,
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toBe(3);
	});

	test("works with objects", async () => {
		const handle = find(
			{ a: 1, b: 4, c: 2 },
			async (value, key) => key === "b" && value > 3,
		);
		await expect(handle.promise).resolves.toBe(4);
	});
});
