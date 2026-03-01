import { describe, expect, test } from "vitest";
import { reject } from "../../src/functional";

describe("reject", () => {
	test("removes matching values", async () => {
		const handle = reject([1, 2, 3, 4], async (item) => item % 2 === 0, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toEqual([1, 3]);
	});
});
