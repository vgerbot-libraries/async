import { describe, expect, test } from "vitest";
import { uniq, uniqBy } from "../../src/collections/uniq";

describe("uniq", () => {
	test("removes duplicates", async () => {
		const handle = uniq([1, 2, 2, 3, 1, 4]);
		await expect(handle.promise).resolves.toEqual([1, 2, 3, 4]);
	});

	test("preserves order", async () => {
		const handle = uniq([3, 1, 2, 1, 3]);
		await expect(handle.promise).resolves.toEqual([3, 1, 2]);
	});

	test("handles empty array", async () => {
		const handle = uniq([]);
		await expect(handle.promise).resolves.toEqual([]);
	});

	test("handles array with no duplicates", async () => {
		const handle = uniq([1, 2, 3]);
		await expect(handle.promise).resolves.toEqual([1, 2, 3]);
	});
});

describe("uniqBy", () => {
	test("removes duplicates by key", async () => {
		const users = [
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
			{ id: 1, name: "Alice Duplicate" },
		];
		const handle = uniqBy(users, async (user) => user.id);
		const result = await handle;
		expect(result).toEqual([
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
		]);
	});

	test("works with concurrency", async () => {
		const items = [1, 2, 3, 2, 4, 1];
		const handle = uniqBy(
			items,
			async (item, token) => {
				await token.sleep(10);
				return item;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([1, 2, 3, 4]);
	});

	test("handles empty array", async () => {
		const handle = uniqBy([], async (item) => item);
		await expect(handle.promise).resolves.toEqual([]);
	});
});
