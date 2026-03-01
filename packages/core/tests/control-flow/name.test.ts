import { describe, expect, test } from "vitest";
import { auto, parallel, series } from "../../src/control-flow";

describe("control-flow name tracking", () => {
	test("uses default name for parallel", async () => {
		const handle = parallel(
			{},
			async () => 1,
			async () => 2,
		);
		expect(handle.name).toBe("parallel");
		await expect(handle.promise).resolves.toEqual([1, 2]);
	});

	test("uses default name for series", async () => {
		const handle = series(
			{},
			async () => 1,
			async (value) => value + 1,
		);
		expect(handle.name).toBe("series");
		await expect(handle.promise).resolves.toBe(2);
	});

	test("uses default name for auto and includes task key in errors", async () => {
		const handle = auto({
			a: async () => 1,
			b: [
				["a"],
				async () => {
					throw new Error("boom");
				},
			] as const,
		});
		expect(handle.name).toBe("auto");
		await expect(handle.promise).rejects.toThrow("[auto.b] boom");
	});

	test("keeps user name and composes task key in auto errors", async () => {
		const handle = auto(
			{
				a: async () => 1,
				b: [
					["a"],
					async () => {
						throw new Error("boom");
					},
				] as const,
			},
			{ name: "pipeline" },
		);
		expect(handle.name).toBe("pipeline");
		await expect(handle.promise).rejects.toThrow("[pipeline.b] boom");
	});
});
