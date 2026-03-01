import { describe, expect, test } from "vitest";
import { groupBy } from "../../src/functional";

describe("groupBy", () => {
	test("groups by async key selector", async () => {
		const handle = groupBy(
			[1, 2, 3, 4, 5],
			async (item) => (item % 2 === 0 ? "even" : "odd"),
			{ concurrency: 3 },
		);
		await expect(handle.promise).resolves.toEqual({
			odd: [1, 3, 5],
			even: [2, 4],
		});
	});
});
