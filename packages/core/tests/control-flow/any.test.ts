import { describe, expect, test } from "vitest";
import { any } from "../../src/control-flow";

describe("any", () => {
	test("resolves with the first fulfilled task", async () => {
		const handle = any(
			{},
			async (token) => {
				await token.sleep(20);
				return "slow";
			},
			async () => {
				throw new Error("failed first");
			},
			async (token) => {
				await token.sleep(5);
				return "fast";
			},
		);

		await expect(handle.promise).resolves.toBe("fast");
	});

	test("rejects with AggregateError when all tasks reject", async () => {
		const handle = any(
			{},
			async () => {
				throw new Error("first failure");
			},
			async () => {
				throw new Error("second failure");
			},
		);

		await expect(handle.promise).rejects.toBeInstanceOf(AggregateError);
	});

	test("rejects with AggregateError when no tasks are provided", async () => {
		const handle = any({});
		await expect(handle.promise).rejects.toBeInstanceOf(AggregateError);
	});
});
