import { describe, expect, test } from "vitest";
import { retry } from "../../src/control-flow/retry";

describe("retry", () => {
	test("succeeds on first attempt", async () => {
		const handle = retry(
			async () => "success",
			{ maxAttempts: 3 },
		);
		await expect(handle.promise).resolves.toBe("success");
	});

	test("retries on failure and eventually succeeds", async () => {
		let attempts = 0;
		const handle = retry(
			async () => {
				attempts++;
				if (attempts < 3) throw new Error("fail");
				return "success";
			},
			{ maxAttempts: 3, delay: 10 },
		);
		await expect(handle.promise).resolves.toBe("success");
		expect(attempts).toBe(3);
	});

	test("fails after max attempts", async () => {
		let attempts = 0;
		const handle = retry(
			async () => {
				attempts++;
				throw new Error("always fails");
			},
			{ maxAttempts: 3, delay: 10 },
		);
		await expect(handle.promise).rejects.toThrow("always fails");
		expect(attempts).toBe(3);
	});

	test("uses exponential backoff", async () => {
		let attempts = 0;
		const delays: number[] = [];
		const handle = retry(
			async () => {
				attempts++;
				throw new Error("fail");
			},
			{ maxAttempts: 3, delay: 10, backOff: "exponential" },
			{
				onRetry: ({ waitMs }) => {
					delays.push(waitMs);
				},
			},
		);
		await expect(handle.promise).rejects.toThrow();
		expect(delays).toEqual([20, 40]); // 10 * 2^1, 10 * 2^2
	});

	test("respects retryIf predicate", async () => {
		let attempts = 0;
		const handle = retry(
			async () => {
				attempts++;
				throw new Error("network error");
			},
			{
				maxAttempts: 3,
				delay: 10,
				retryIf: (error) => error.message.includes("network"),
			},
		);
		await expect(handle.promise).rejects.toThrow();
		expect(attempts).toBe(3);
	});

	test("does not retry when retryIf returns false", async () => {
		let attempts = 0;
		const handle = retry(
			async () => {
				attempts++;
				throw new Error("validation error");
			},
			{
				maxAttempts: 3,
				delay: 10,
				retryIf: (error) => error.message.includes("network"),
			},
		);
		await expect(handle.promise).rejects.toThrow();
		expect(attempts).toBe(1);
	});
});
