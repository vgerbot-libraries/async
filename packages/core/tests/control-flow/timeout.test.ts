import { describe, expect, test } from "vitest";
import { timeout } from "../../src/control-flow/timeout";
import { CancelError } from "../../src/cancellable";

describe("timeout", () => {
	test("completes successfully within timeout", async () => {
		const handle = timeout(
			async (token) => {
				await token.sleep(50);
				return "done";
			},
			200,
		);
		await expect(handle.promise).resolves.toBe("done");
	});

	test("cancels task when timeout exceeded", async () => {
		const handle = timeout(
			async (token) => {
				await token.sleep(500);
				return "done";
			},
			100,
		);
		await expect(handle.promise).rejects.toThrow(CancelError);
	});

	test("can be manually cancelled", async () => {
		const handle = timeout(
			async (token) => {
				await token.sleep(500);
				return "done";
			},
			1000,
		);
		handle.cancel("manual cancel");
		await expect(handle.promise).rejects.toThrow(CancelError);
	});

	test("respects fallback on timeout", async () => {
		const handle = timeout(
			async (token) => {
				await token.sleep(500);
				return "done";
			},
			100,
			{ fallback: "fallback value" },
		);
		await expect(handle.promise).resolves.toBe("fallback value");
	});
});
