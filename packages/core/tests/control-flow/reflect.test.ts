import { describe, expect, test } from "vitest";
import { reflect } from "../../src/control-flow/reflect";

describe("reflect", () => {
	test("wraps successful result", async () => {
		const handle = reflect(async () => "success");
		const result = await handle;

		expect(result).toEqual({
			status: "fulfilled",
			value: "success",
		});
	});

	test("wraps error result", async () => {
		const error = new Error("test error");
		const handle = reflect(async () => {
			throw error;
		});
		const result = await handle;

		expect(result).toEqual({
			status: "rejected",
			reason: error,
		});
	});

	test("never rejects", async () => {
		const handle = reflect(async () => {
			throw new Error("should not reject");
		});

		await expect(handle.promise).resolves.toMatchObject({
			status: "rejected",
		});
	});

	test("works with async operations", async () => {
		const handle = reflect(async (token) => {
			await token.sleep(50);
			return 42;
		});

		const result = await handle;
		expect(result).toEqual({
			status: "fulfilled",
			value: 42,
		});
	});

	test("can be used with parallel operations", async () => {
		const tasks = [
			reflect(async () => "success"),
			reflect(async () => {
				throw new Error("fail");
			}),
			reflect(async () => 42),
		];

		const results = await Promise.all(tasks.map((t) => t.promise));

		expect(results).toEqual([
			{ status: "fulfilled", value: "success" },
			{ status: "rejected", reason: expect.any(Error) },
			{ status: "fulfilled", value: 42 },
		]);
	});
});
