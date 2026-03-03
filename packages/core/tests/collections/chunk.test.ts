import { describe, expect, test } from "vitest";
import { chunk } from "../../src/collections/chunk";

describe("chunk", () => {
	test("splits array into chunks of specified size", async () => {
		const handle = chunk([1, 2, 3, 4, 5], 2);
		await expect(handle.promise).resolves.toEqual([[1, 2], [3, 4], [5]]);
	});

	test("handles exact division", async () => {
		const handle = chunk([1, 2, 3, 4], 2);
		await expect(handle.promise).resolves.toEqual([[1, 2], [3, 4]]);
	});

	test("handles empty array", async () => {
		const handle = chunk([], 2);
		await expect(handle.promise).resolves.toEqual([]);
	});

	test("handles chunk size larger than array", async () => {
		const handle = chunk([1, 2], 5);
		await expect(handle.promise).resolves.toEqual([[1, 2]]);
	});

	test("throws on invalid chunk size", async () => {
		const handle = chunk([1, 2, 3], 0);
		await expect(handle.promise).rejects.toThrow("Chunk size must be positive");
	});

	test("can be cancelled", async () => {
		const handle = chunk([1, 2, 3, 4, 5], 2);
		handle.cancel();
		await expect(handle.promise).rejects.toThrow();
	});
});
