import { describe, expect, test } from "vitest";
import { flatMap } from "../../src/collections/flatMap";

describe("flatMap", () => {
	test("maps and flattens results", async () => {
		const handle = flatMap(
			[1, 2, 3],
			async (num) => [num, num * 2],
		);
		await expect(handle.promise).resolves.toEqual([1, 2, 2, 4, 3, 6]);
	});

	test("works with concurrency", async () => {
		const handle = flatMap(
			[1, 2, 3],
			async (num, token) => {
				await token.sleep(10);
				return [num, num * 2];
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([1, 2, 2, 4, 3, 6]);
	});

	test("handles empty arrays in results", async () => {
		const handle = flatMap(
			[1, 2, 3],
			async (num) => (num === 2 ? [] : [num]),
		);
		await expect(handle.promise).resolves.toEqual([1, 3]);
	});
});
