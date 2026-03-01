import { describe, expect, test } from "vitest";
import { reduce } from "../../src/collections";

describe("reduce", () => {
	test("supports object input", async () => {
		const handle = reduce(
			{ a: 1, b: 2, c: 3 },
			async (acc, value, key) => `${acc}${key}:${value};`,
			"",
		);
		await expect(handle.promise).resolves.toBe("a:1;b:2;c:3;");
	});
});
