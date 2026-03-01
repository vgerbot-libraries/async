import { describe, expect, test } from "vitest";
import { filter } from "../../src/collections";

describe("filter", () => {
	test("supports object input and returns kept values", async () => {
		const handle = filter(
			{ a: 1, b: 2, c: 3, d: 4 },
			async (value, key) => value % 2 === 0 && key !== "d",
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([2]);
	});
});
