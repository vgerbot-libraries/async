import { describe, expect, test } from "vitest";
import { sortBy } from "../../src/collections";

describe("sortBy", () => {
	test("sorts by numeric criteria", async () => {
		const users = [
			{ name: "Alice", age: 30 },
			{ name: "Bob", age: 25 },
			{ name: "Charlie", age: 35 },
		];
		const handle = sortBy(users, async (user) => user.age);
		await expect(handle.promise).resolves.toEqual([
			{ name: "Bob", age: 25 },
			{ name: "Alice", age: 30 },
			{ name: "Charlie", age: 35 },
		]);
	});

	test("sorts by string criteria", async () => {
		const items = [{ id: "c" }, { id: "a" }, { id: "b" }];
		const handle = sortBy(items, async (item) => item.id);
		await expect(handle.promise).resolves.toEqual([
			{ id: "a" },
			{ id: "b" },
			{ id: "c" },
		]);
	});

	test("supports concurrency limit", async () => {
		const order: number[] = [];
		const handle = sortBy(
			[3, 1, 2],
			async (n, token) => {
				await token.sleep(10);
				order.push(n);
				return n;
			},
			{ concurrency: 1 },
		);
		await handle;
		expect(order).toEqual([3, 1, 2]);
	});

	test("supports object input", async () => {
		const handle = sortBy({ a: 3, b: 1, c: 2 }, async (value) => value);
		await expect(handle.promise).resolves.toEqual([1, 2, 3]);
	});

	test("handles empty array", async () => {
		const handle = sortBy([], async (n: number) => n);
		await expect(handle.promise).resolves.toEqual([]);
	});

	test("maintains stable sort for equal values", async () => {
		const items = [
			{ id: 1, value: 2 },
			{ id: 2, value: 1 },
			{ id: 3, value: 2 },
		];
		const handle = sortBy(items, async (item) => item.value);
		const result = await handle;
		expect(result[0].value).toBe(1);
		expect(result[1].value).toBe(2);
		expect(result[2].value).toBe(2);
	});
});
