import { describe, expect, test } from "vitest";
import { times } from "../../src/functional";

describe("times", () => {
	test("repeats iterator and preserves order", async () => {
		const handle = times(
			5,
			async (index, token) => {
				await token.sleep(2);
				return index * 2;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([0, 2, 4, 6, 8]);
	});
});
