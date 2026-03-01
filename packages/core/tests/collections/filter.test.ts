import { describe, expect, test } from "vitest";
import { filter } from "../../src/collections";

describe("filter", () => {
	test("filters array input with default options", async () => {
		const handle = filter([1, 2, 3, 4], async (value) => value % 2 === 0);
		await expect(handle.promise).resolves.toEqual([2, 4]);
	});

	test("supports object input and returns kept values", async () => {
		const handle = filter(
			{ a: 1, b: 2, c: 3, d: 4 },
			async (value, key) => value % 2 === 0 && key !== "d",
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([2]);
	});

	test("supports Infinity concurrency option", async () => {
		const handle = filter(
			{ a: 1, b: 2, c: 3, d: 4 },
			async (value, key) => value > 1 && key !== "c",
			{ concurrency: Infinity },
		);
		await expect(handle.promise).resolves.toEqual([2, 4]);
	});
});
