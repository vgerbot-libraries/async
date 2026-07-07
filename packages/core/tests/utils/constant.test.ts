import { describe, expect, test, vi } from "vitest";
import { CancelError, cancellable } from "../../src/cancellable";
import { constant } from "../../src/utils/constant";

describe("constant", () => {
	test("returns constant value", async () => {
		const handle = constant(42);
		await expect(handle.promise).resolves.toBe(42);
	});

	test("works with objects", async () => {
		const obj = { a: 1, b: 2 };
		const handle = constant(obj);
		await expect(handle.promise).resolves.toBe(obj);
	});

	test("works with null and undefined", async () => {
		const nullHandle = constant(null);
		await expect(nullHandle.promise).resolves.toBeNull();

		const undefinedHandle = constant(undefined);
		await expect(undefinedHandle.promise).resolves.toBeUndefined();
	});

	test("resolves immediately before timeout fires", async () => {
		vi.useFakeTimers();
		try {
			const handle = constant(42, { timeout: 100 });
			await expect(handle.promise).resolves.toBe(42);
			vi.advanceTimersByTime(100);
		} finally {
			vi.useRealTimers();
		}
	});

	test("timeout cancels a slow cancellable task", async () => {
		vi.useFakeTimers();
		try {
			const handle = cancellable(
				async (token) => {
					await token.sleep(1000);
					return 42;
				},
				{ timeout: 10, name: "slow-task" },
			);
			vi.advanceTimersByTime(10);
			await expect(handle.promise).rejects.toBeInstanceOf(CancelError);
		} finally {
			vi.useRealTimers();
		}
	});
});
