import { describe, expect, test } from "vitest";
import { some } from "../../src/collections";

describe("some", () => {
	test("returns false for empty collection", async () => {
		const handle = some([], async () => true);
		await expect(handle.promise).resolves.toBe(false);
	});

	test("supports default options (Infinity concurrency path)", async () => {
		const handle = some([1, 2, 3], async (value) => value === 3);
		await expect(handle.promise).resolves.toBe(true);
	});

	test("returns true when any item matches", async () => {
		const handle = some([2, 4, 6, 7], async (item) => item % 2 === 1, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toBe(true);
	});

	test("supports object input", async () => {
		const handle = some(
			{ a: 2, b: 4, c: 5 },
			async (value) => value % 2 === 1,
			{
				concurrency: 2,
			},
		);
		await expect(handle.promise).resolves.toBe(true);
	});

	test("runs sequentially when concurrency is non-positive", async () => {
		const handle = some([1, 2, 3], async (value) => value === 4, {
			concurrency: 0,
		});
		await expect(handle.promise).resolves.toBe(false);
	});

	test("rejects when predicate throws", async () => {
		const error = new Error("boom");
		const handle = some(
			[1, 2, 3],
			async (value) => {
				if (value === 2) {
					throw error;
				}
				return false;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).rejects.toBe(error);
	});

	test("keeps first error when multiple workers fail", async () => {
		const firstError = new Error("first");
		const secondError = new Error("second");
		const handle = some(
			[1, 2],
			async (value) => {
				if (value === 1) {
					throw firstError;
				}
				throw secondError;
			},
			{ concurrency: 2 },
		);

		await expect(handle.promise).rejects.toBe(firstError);
	});
});
