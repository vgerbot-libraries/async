import { describe, expect, test } from "vitest";
import { forever } from "../../src/control-flow/forever";
import { CancelError } from "../../src/cancellable";

describe("forever", () => {
	test("executes task repeatedly", async () => {
		let count = 0;
		const handle = forever(async (token) => {
			count++;
			await token.sleep(10);
			if (count >= 3) {
				throw new Error("stop");
			}
		});

		await expect(handle.promise).rejects.toThrow("stop");
		expect(count).toBe(3);
	});

	test("can be cancelled", async () => {
		let count = 0;
		const handle = forever(async (token) => {
			count++;
			await token.sleep(10);
		});

		setTimeout(() => handle.cancel(), 50);
		await expect(handle.promise).rejects.toThrow(CancelError);
		expect(count).toBeGreaterThan(0);
	});

	test("respects token cancellation", async () => {
		let count = 0;
		const handle = forever(async (token) => {
			count++;
			await token.sleep(100);
		});

		handle.cancel();
		await expect(handle.promise).rejects.toThrow(CancelError);
		expect(count).toBeLessThanOrEqual(1);
	});

	test("runs continuously until cancelled", async () => {
		let count = 0;
		const handle = forever(async (token) => {
			count++;
			await token.sleep(1); // Small delay to prevent blocking event loop
		});

		await new Promise((resolve) => setTimeout(resolve, 50));
		handle.cancel();

		await expect(handle.promise).rejects.toThrow(CancelError);
		expect(count).toBeGreaterThan(10); // Should run many times in 50ms
	});
});
