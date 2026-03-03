import { describe, expect, test } from "vitest";
import { partition } from "../../src/collections/partition";

describe("partition", () => {
	test("splits array based on predicate", async () => {
		const handle = partition(
			[1, 2, 3, 4, 5],
			async (item) => item % 2 === 0,
		);
		await expect(handle.promise).resolves.toEqual([[2, 4], [1, 3, 5]]);
	});

	test("handles all truthy", async () => {
		const handle = partition(
			[2, 4, 6],
			async (item) => item % 2 === 0,
		);
		await expect(handle.promise).resolves.toEqual([[2, 4, 6], []]);
	});

	test("handles all falsy", async () => {
		const handle = partition(
			[1, 3, 5],
			async (item) => item % 2 === 0,
		);
		await expect(handle.promise).resolves.toEqual([[], [1, 3, 5]]);
	});

	test("works with concurrency", async () => {
		const handle = partition(
			[1, 2, 3, 4, 5, 6],
			async (item, token) => {
				await token.sleep(10);
				return item > 3;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([[4, 5, 6], [1, 2, 3]]);
	});

	test("handles empty array", async () => {
		const handle = partition(
			[],
			async (item) => item > 0,
		);
		await expect(handle.promise).resolves.toEqual([[], []]);
	});
});
