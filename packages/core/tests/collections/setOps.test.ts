import { describe, expect, test } from "vitest";
import { difference, intersection, union } from "../../src/collections/setOps";

describe("setOps", () => {
	describe("difference", () => {
		test("returns elements in arr1 not in arr2", async () => {
			const handle = difference([1, 2, 3, 4], [2, 4]);
			await expect(handle.promise).resolves.toEqual([1, 3]);
		});

		test("handles no overlap", async () => {
			const handle = difference([1, 2], [3, 4]);
			await expect(handle.promise).resolves.toEqual([1, 2]);
		});

		test("handles complete overlap", async () => {
			const handle = difference([1, 2], [1, 2, 3]);
			await expect(handle.promise).resolves.toEqual([]);
		});

		test("handles empty arrays", async () => {
			const handle = difference([], [1, 2]);
			await expect(handle.promise).resolves.toEqual([]);
		});
	});

	describe("intersection", () => {
		test("returns common elements", async () => {
			const handle = intersection([1, 2, 3], [2, 3, 4]);
			await expect(handle.promise).resolves.toEqual([2, 3]);
		});

		test("handles no overlap", async () => {
			const handle = intersection([1, 2], [3, 4]);
			await expect(handle.promise).resolves.toEqual([]);
		});

		test("handles complete overlap", async () => {
			const handle = intersection([1, 2], [1, 2]);
			await expect(handle.promise).resolves.toEqual([1, 2]);
		});
	});

	describe("union", () => {
		test("returns unique elements from both arrays", async () => {
			const handle = union([1, 2, 3], [2, 3, 4]);
			await expect(handle.promise).resolves.toEqual([1, 2, 3, 4]);
		});

		test("removes duplicates within arrays", async () => {
			const handle = union([1, 1, 2], [2, 3, 3]);
			await expect(handle.promise).resolves.toEqual([1, 2, 3]);
		});

		test("handles empty arrays", async () => {
			const handle = union([], [1, 2]);
			await expect(handle.promise).resolves.toEqual([1, 2]);
		});
	});
});
