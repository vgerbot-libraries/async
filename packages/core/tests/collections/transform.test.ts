import { describe, expect, test } from "vitest";
import { transform } from "../../src/collections";

describe("transform", () => {
	test("transforms array with mutable accumulator", async () => {
		const handle = transform(
			[1, 2, 3, 4],
			async (result, num) => {
				if (num % 2 === 0) {
					result.push(num * 2);
				}
			},
			[] as number[],
		);
		await expect(handle.promise).resolves.toEqual([4, 8]);
	});

	test("transforms object with mutable accumulator", async () => {
		const handle = transform(
			{ a: 1, b: 2, c: 3 },
			async (result, value, key) => {
				result[key] = value * 10;
			},
			{} as Record<string, number>,
		);
		await expect(handle.promise).resolves.toEqual({ a: 10, b: 20, c: 30 });
	});

	test("defaults to empty array for array input", async () => {
		const handle = transform([1, 2, 3], async (result: number[], num) => {
			result.push(num);
		});
		await expect(handle.promise).resolves.toEqual([1, 2, 3]);
	});

	test("defaults to empty object for object input", async () => {
		const handle = transform(
			{ a: 1 },
			async (result: Record<string, number>, value, key) => {
				result[key] = value;
			},
		);
		await expect(handle.promise).resolves.toEqual({ a: 1 });
	});

	test("supports concurrency limit", async () => {
		const order: number[] = [];
		const handle = transform(
			[1, 2, 3],
			async (result: number[], num, token) => {
				await token.sleep(10);
				order.push(num);
				result.push(num);
			},
			[] as number[],
			{ concurrency: 1 },
		);
		await handle;
		expect(order).toEqual([1, 2, 3]);
	});

	test("handles empty array", async () => {
		const handle = transform(
			[],
			async (result: number[], num) => {
				result.push(num);
			},
			[] as number[],
		);
		await expect(handle.promise).resolves.toEqual([]);
	});

	test("allows building complex structures", async () => {
		const handle = transform(
			[1, 2, 3],
			async (result: Record<string, number>, num) => {
				result[`key${num}`] = num * num;
			},
			{} as Record<string, number>,
		);
		await expect(handle.promise).resolves.toEqual({
			key1: 1,
			key2: 4,
			key3: 9,
		});
	});
});
