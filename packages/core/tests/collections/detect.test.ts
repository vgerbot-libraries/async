import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable";
import { detect } from "../../src/collections";

describe("detect", () => {
	test("resolves first matched item", async () => {
		const seen: number[] = [];
		const handle = detect(
			[1, 2, 3, 4],
			async (item) => {
				seen.push(item);
				return item > 2;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toBe(3);
		expect(seen.length).toBeGreaterThan(0);
	});

	test("supports object input", async () => {
		const handle = detect(
			{ c: 3, a: 1, b: 2 },
			async (value, key) => key === "b" && value === 2,
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toBe(2);
	});

	test("respects cancellation via options.signal", async () => {
		const controller = new AbortController();
		const handle = detect(
			[1, 2, 3],
			async (_item, token) => {
				await token.sleep(1000);
				return false;
			},
			{ signal: controller.signal },
		);
		controller.abort("cancel detect");
		await expect(handle.promise).rejects.toBeInstanceOf(CancelError);
	});
});
