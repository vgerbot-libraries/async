import { describe, expect, test } from "vitest";
import { allSettled } from "../../src/control-flow";

describe("allSettled", () => {
	test("returns fulfilled and rejected outcomes in task order", async () => {
		const handle = allSettled(
			{},
			async (token) => {
				await token.sleep(5);
				return "slow";
			},
			async () => "fast",
			async () => {
				throw new Error("boom");
			},
		);

		await expect(handle.promise).resolves.toMatchObject([
			{ status: "fulfilled", value: "slow" },
			{ status: "fulfilled", value: "fast" },
			{ status: "rejected" },
		]);
	});

	test("returns empty array when no tasks are provided", async () => {
		const handle = allSettled({});
		await expect(handle.promise).resolves.toEqual([]);
	});

	test("still resolves when all tasks reject", async () => {
		const handle = allSettled(
			{},
			async () => {
				throw new Error("first");
			},
			async () => {
				throw new Error("second");
			},
		);

		const result = await handle.promise;
		expect(result).toEqual([
			{ status: "rejected", reason: expect.any(Error) },
			{ status: "rejected", reason: expect.any(Error) },
		]);
	});
});
