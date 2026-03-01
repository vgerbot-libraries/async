import { describe, expect, test } from "vitest";
import { mapValues } from "../../src/functional";

describe("mapValues", () => {
	test("maps values while preserving keys", async () => {
		const handle = mapValues({ a: 1, b: 2, c: 3 }, async (value) => value * 2, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toEqual({
			a: 2,
			b: 4,
			c: 6,
		});
	});
});
