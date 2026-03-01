import { describe, expect, test } from "vitest";
import { map } from "../../src/functional";

describe("map", () => {
	test("supports object input and keeps key iteration order", async () => {
		const handle = map(
			{ a: 1, b: 2, c: 3 },
			async (value, key) => `${String(key)}:${value * 2}`,
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual(["a:2", "b:4", "c:6"]);
	});
});
