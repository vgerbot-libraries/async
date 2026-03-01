import { describe, expect, test } from "vitest";
import { CancelError, cancellable } from "../../src/cancellable";
import { series } from "../../src/control-flow";

describe("series", () => {
	test("supports function, promise, and cancellable handle tasks", async () => {
		const nestedHandle = cancellable(async (token) => {
			await token.sleep(5);
			return 3;
		});

		const handle = series(
			{},
			async () => 1,
			Promise.resolve(2),
			nestedHandle,
			async (value) => value * 2,
		);

		await expect(handle.promise).resolves.toBe(6);
	});

	test("rejects when a nested cancellable handle is already cancelled", async () => {
		const cancelledHandle = cancellable(async (token) => {
			await token.sleep(20);
			return 1;
		});
		cancelledHandle.cancel("stop");

		const handle = series({}, async () => 0, cancelledHandle);

		await expect(handle.promise).rejects.toBeInstanceOf(CancelError);
	});
});
