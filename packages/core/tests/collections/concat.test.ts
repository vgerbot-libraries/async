import { describe, expect, test } from "vitest";
import { concat } from "../../src/collections";

describe("concat", () => {
	test("maps and flattens array results", async () => {
		const handle = concat([1, 2, 3], async (n) => [n, n * 2]);
		await expect(handle.promise).resolves.toEqual([1, 2, 2, 4, 3, 6]);
	});

	test("works with empty arrays", async () => {
		const handle = concat([1, 2], async () => []);
		await expect(handle.promise).resolves.toEqual([]);
	});

	test("supports concurrency limit", async () => {
		const order: number[] = [];
		const handle = concat(
			[1, 2, 3],
			async (n, token) => {
				await token.sleep(10);
				order.push(n);
				return [n];
			},
			{ concurrency: 1 },
		);
		await handle;
		expect(order).toEqual([1, 2, 3]);
	});

	test("supports object input", async () => {
		const handle = concat({ a: "hello", b: "world" }, async (value) =>
			value.split(""),
		);
		await expect(handle.promise).resolves.toEqual([
			"h",
			"e",
			"l",
			"l",
			"o",
			"w",
			"o",
			"r",
			"l",
			"d",
		]);
	});

	test("handles nested arrays", async () => {
		const handle = concat([1, 2], async (n) => [[n], [n * 2]]);
		await expect(handle.promise).resolves.toEqual([[1], [2], [2], [4]]);
	});
});
