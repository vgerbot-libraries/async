import { describe, expect, test } from "vitest";
import { race } from "../../src/control-flow";

describe("race", () => {
	test("resolves with value from first settled fulfilled task", async () => {
		const handle = race(
			{},
			async (token) => {
				await token.sleep(20);
				return "slow";
			},
			async (token) => {
				await token.sleep(5);
				return "fast";
			},
		);

		await expect(handle.promise).resolves.toBe("fast");
	});

	test("rejects when first settled task rejects", async () => {
		const handle = race(
			{},
			async (token) => {
				await token.sleep(20);
				return "slow";
			},
			async () => {
				throw new Error("boom");
			},
		);

		await expect(handle.promise).rejects.toThrow("boom");
	});

	test("resolves immediately with first sync result", async () => {
		const handle = race(
			{},
			async () => "sync winner",
			async (token) => {
				await token.sleep(10);
				return "later";
			},
		);

		await expect(handle.promise).resolves.toBe("sync winner");
	});
});
