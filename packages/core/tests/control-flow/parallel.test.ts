import { describe, expect, test } from "vitest";
import { all, parallel } from "../../src/control-flow";

describe("parallel", () => {
	test("respects finite concurrency and preserves task order", async () => {
		let running = 0;
		let maxRunning = 0;

		const handle = parallel(
			{ concurrency: 2 },
			...Array.from({ length: 5 }, (_, index) => async (token) => {
				running += 1;
				maxRunning = Math.max(maxRunning, running);
				await token.sleep(5);
				running -= 1;
				return index;
			}),
		);

		await expect(handle.promise).resolves.toEqual([0, 1, 2, 3, 4]);
		expect(maxRunning).toBeLessThanOrEqual(2);
	});

	test("all is an alias of parallel", async () => {
		const handle = all(
			{},
			async () => "A",
			async () => "B",
		);

		await expect(handle.promise).resolves.toEqual(["A", "B"]);
	});
});
