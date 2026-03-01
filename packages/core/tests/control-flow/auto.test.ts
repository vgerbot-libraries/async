import { describe, expect, test } from "vitest";
import { auto } from "../../src/control-flow";

describe("auto", () => {
	test("runs tasks by dependency order", async () => {
		const handle = auto(
			{
				a: async () => 1,
				b: [["a"], async (results) => (results.a as number) + 1] as const,
				c: [["a"], async (results) => (results.a as number) + 2] as const,
				d: [
					["b", "c"],
					async (results) => (results.b as number) + (results.c as number),
				] as const,
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual({ a: 1, b: 2, c: 3, d: 5 });
	});

	test("rejects unknown dependencies", async () => {
		const handle = auto({
			a: [["missing"], async () => 1] as const,
		});
		await expect(handle.promise).rejects.toThrow(
			'depends on unknown task "missing"',
		);
	});

	test("rejects dependency cycles", async () => {
		const handle = auto({
			a: [["b"], async () => 1] as const,
			b: [["a"], async () => 2] as const,
		});
		await expect(handle.promise).rejects.toThrow(
			"auto cannot resolve dependencies",
		);
	});
});
