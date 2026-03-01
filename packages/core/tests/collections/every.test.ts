import { describe, expect, test } from "vitest";
import { every } from "../../src/collections";

describe("every", () => {
	test("returns false when one item fails", async () => {
		const handle = every([2, 4, 6, 7], async (item) => item % 2 === 0, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toBe(false);
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
