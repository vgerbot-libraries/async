import { describe, expect, test } from "vitest";
import { some } from "../../src/functional";

describe("some", () => {
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
});
