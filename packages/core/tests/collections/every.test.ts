import { describe, expect, test } from "vitest";
import { every } from "../../src/collections";

describe("every", () => {
	test("returns true for empty collection", async () => {
		const handle = every([], async () => true);
		await expect(handle.promise).resolves.toBe(true);
	});

	test("supports default options (Infinity concurrency path)", async () => {
		const handle = every([2, 4, 6], async (item) => item % 2 === 0);
		await expect(handle.promise).resolves.toBe(true);
	});

	test("returns false when one item fails", async () => {
		const handle = every([2, 4, 6, 7], async (item) => item % 2 === 0, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toBe(false);
	});

	test("runs sequentially when concurrency is non-positive", async () => {
		const order: number[] = [];
		const handle = every(
			[1, 2, 3],
			async (item) => {
				order.push(item);
				return true;
			},
			{ concurrency: 0 },
		);
		await expect(handle.promise).resolves.toBe(true);
		expect(order).toEqual([1, 2, 3]);
	});

	test("returns false in sequential mode when predicate fails", async () => {
		const handle = every([1, 2, 3], async (item) => item < 3, {
			concurrency: 0,
		});
		await expect(handle.promise).resolves.toBe(false);
	});

	test("rejects when predicate throws", async () => {
		const error = new Error("boom");
		const handle = every(
			[1, 2, 3],
			async (item) => {
				if (item === 2) {
					throw error;
				}
				return true;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).rejects.toBe(error);
	});

	test("keeps first error when multiple workers fail", async () => {
		const firstError = new Error("first");
		const secondError = new Error("second");
		const handle = every(
			[1, 2],
			async (item) => {
				if (item === 1) {
					throw firstError;
				}
				throw secondError;
			},
			{ concurrency: 2 },
		);

		await expect(handle.promise).rejects.toBe(firstError);
	});

	test("supports object input", async () => {
		const handle = every(
			{ a: 2, b: 4, c: 6 },
			async (value, key) => key !== "x" && value % 2 === 0,
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toBe(true);
	});
});
