import { describe, expect, test } from "vitest";
import { zip } from "../../src/collections/zip";

describe("zip", () => {
	test("combines arrays element-wise", async () => {
		const handle = zip([[1, 2, 3], ["a", "b", "c"]]);
		await expect(handle.promise).resolves.toEqual([
			[1, "a"],
			[2, "b"],
			[3, "c"],
		]);
	});

	test("handles arrays of different lengths", async () => {
		const handle = zip([[1, 2, 3, 4], ["a", "b"]]);
		await expect(handle.promise).resolves.toEqual([
			[1, "a"],
			[2, "b"],
		]);
	});

	test("handles three arrays", async () => {
		const handle = zip([[1, 2], ["a", "b"], [true, false]]);
		await expect(handle.promise).resolves.toEqual([
			[1, "a", true],
			[2, "b", false],
		]);
	});

	test("handles empty arrays", async () => {
		const handle = zip([[], [1, 2]]);
		await expect(handle.promise).resolves.toEqual([]);
	});

	test("handles no arrays", async () => {
		const handle = zip([]);
		await expect(handle.promise).resolves.toEqual([]);
	});
});
