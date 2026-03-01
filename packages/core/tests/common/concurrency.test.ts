import { describe, expect, test, vi } from "vitest";
import { runWithConcurrency } from "../../src/common/concurrency";

describe("runWithConcurrency", () => {
	test("should process all items with specified concurrency", async () => {
		const items = [1, 2, 3, 4, 5];
		const processor = vi.fn(async (item: number) => item * 2);

		const result = await runWithConcurrency(items, 2, processor);

		expect(result).toEqual([2, 4, 6, 8, 10]);
		expect(processor).toHaveBeenCalledTimes(5);
	});

	test("should preserve order of results", async () => {
		const items = [1, 2, 3, 4, 5];
		const processor = async (item: number) => {
			await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
			return item * 2;
		};

		const result = await runWithConcurrency(items, 3, processor);

		expect(result).toEqual([2, 4, 6, 8, 10]);
	});

	test("should handle concurrency of 1 (sequential)", async () => {
		const items = [1, 2, 3];
		const order: number[] = [];
		const processor = async (item: number) => {
			order.push(item);
			return item;
		};

		await runWithConcurrency(items, 1, processor);

		expect(order).toEqual([1, 2, 3]);
	});

	test("should handle infinite concurrency", async () => {
		const items = [1, 2, 3, 4, 5];
		const processor = vi.fn(async (item: number) => item * 2);

		const result = await runWithConcurrency(
			items,
			Number.POSITIVE_INFINITY,
			processor,
		);

		expect(result).toEqual([2, 4, 6, 8, 10]);
		expect(processor).toHaveBeenCalledTimes(5);
	});

	test("should handle zero concurrency as infinite", async () => {
		const items = [1, 2, 3];
		const processor = vi.fn(async (item: number) => item * 2);

		const result = await runWithConcurrency(items, 0, processor);

		expect(result).toEqual([2, 4, 6]);
	});

	test("should handle negative concurrency as infinite", async () => {
		const items = [1, 2, 3];
		const processor = vi.fn(async (item: number) => item * 2);

		const result = await runWithConcurrency(items, -1, processor);

		expect(result).toEqual([2, 4, 6]);
	});

	test("should handle empty array", async () => {
		const items: number[] = [];
		const processor = vi.fn(async (item: number) => item * 2);

		const result = await runWithConcurrency(items, 2, processor);

		expect(result).toEqual([]);
		expect(processor).not.toHaveBeenCalled();
	});

	test("should handle single item", async () => {
		const items = [42];
		const processor = async (item: number) => item * 2;

		const result = await runWithConcurrency(items, 2, processor);

		expect(result).toEqual([84]);
	});

	test("should handle promise input", async () => {
		const itemsPromise = Promise.resolve([1, 2, 3]);
		const processor = async (item: number) => item * 2;

		const result = await runWithConcurrency(itemsPromise, 2, processor);

		expect(result).toEqual([2, 4, 6]);
	});

	test("should throw first error and stop processing", async () => {
		const items = [1, 2, 3, 4, 5];
		const processor = async (item: number) => {
			if (item === 3) {
				throw new Error("Error at 3");
			}
			return item * 2;
		};

		await expect(runWithConcurrency(items, 2, processor)).rejects.toThrow(
			"Error at 3",
		);
	});

	test("should pass index to processor", async () => {
		const items = ["a", "b", "c"];
		const processor = vi.fn(
			async (item: string, index: number) => `${item}-${index}`,
		);

		const result = await runWithConcurrency(items, 2, processor);

		expect(result).toEqual(["a-0", "b-1", "c-2"]);
		expect(processor).toHaveBeenCalledWith("a", 0);
		expect(processor).toHaveBeenCalledWith("b", 1);
		expect(processor).toHaveBeenCalledWith("c", 2);
	});

	test("should respect concurrency limit", async () => {
		const items = [1, 2, 3, 4, 5];
		let activeCount = 0;
		let maxActiveCount = 0;

		const processor = async (item: number) => {
			activeCount++;
			maxActiveCount = Math.max(maxActiveCount, activeCount);
			await new Promise((resolve) => setTimeout(resolve, 10));
			activeCount--;
			return item;
		};

		await runWithConcurrency(items, 2, processor);

		expect(maxActiveCount).toBeLessThanOrEqual(2);
	});

	test("should handle complex objects", async () => {
		const items = [
			{ id: 1, name: "first" },
			{ id: 2, name: "second" },
			{ id: 3, name: "third" },
		];
		const processor = async (item: { id: number; name: string }) => ({
			...item,
			processed: true,
		});

		const result = await runWithConcurrency(items, 2, processor);

		expect(result).toEqual([
			{ id: 1, name: "first", processed: true },
			{ id: 2, name: "second", processed: true },
			{ id: 3, name: "third", processed: true },
		]);
	});
});
