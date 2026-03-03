import { describe, expect, test } from "vitest";
import { delay } from "../../src/control-flow/delay";
import { CancelError } from "../../src/cancellable";

describe("delay", () => {
	test("delays for specified duration", async () => {
		const start = Date.now();
		await delay(100);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(90);
	});

	test("can be cancelled", async () => {
		const handle = delay(1000);
		handle.cancel("test cancel");
		await expect(handle.promise).rejects.toThrow(CancelError);
	});

	test("respects external signal", async () => {
		const controller = new AbortController();
		const handle = delay(1000, { signal: controller.signal });
		controller.abort("external abort");
		await expect(handle.promise).rejects.toThrow(CancelError);
	});

	test("resolves to void", async () => {
		const result = await delay(10);
		expect(result).toBeUndefined();
	});
});
