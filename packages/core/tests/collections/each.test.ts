import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable";
import { each } from "../../src/collections";

describe("each", () => {
	test("iterates object input with side effects", async () => {
		const seen: string[] = [];
		const handle = each(
			{ a: 1, b: 2, c: 3 },
			async (value, key) => {
				seen.push(`${String(key)}:${value}`);
			},
			{ concurrency: 2 },
		);
		await handle;
		expect(seen).toEqual(["a:1", "b:2", "c:3"]);
	});

	test("respects cancellation via options.signal", async () => {
		const controller = new AbortController();
		const handle = each(
			[1, 2, 3],
			async (_item, token) => {
				await token.sleep(1000);
			},
			{ signal: controller.signal },
		);
		controller.abort("cancel each");
		await expect(handle.promise).rejects.toBeInstanceOf(CancelError);
	});
});
