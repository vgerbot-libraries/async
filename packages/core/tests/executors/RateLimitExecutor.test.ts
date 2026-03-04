import { describe, expect, test } from "vitest";
import { RateLimitExecutor } from "../../src/executors/RateLimitExecutor";
import { noop } from "../../src/utils";

describe("RateLimitExecutor", () => {
	test("allows requests within limit", async () => {
		const executor = new RateLimitExecutor(5, 1000);
		const results: number[] = [];

		for (let i = 0; i < 5; i++) {
			executor.exec(async () => {
				results.push(i);
				return i;
			});
		}

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(results.length).toBe(5);
	});

	test("delays requests exceeding limit", async () => {
		const executor = new RateLimitExecutor(2, 500);
		const timestamps: number[] = [];

		const promises = [];
		for (let i = 0; i < 4; i++) {
			promises.push(
				executor.exec(async () => {
					timestamps.push(Date.now());
					return i;
				}),
			);
		}

		await Promise.all(promises);

		// First 2 should execute immediately, next 2 after window
		const firstBatch = timestamps.slice(0, 2);
		const secondBatch = timestamps.slice(2, 4);

		const firstBatchSpread = Math.max(...firstBatch) - Math.min(...firstBatch);
		const gap = Math.min(...secondBatch) - Math.max(...firstBatch);

		expect(firstBatchSpread).toBeLessThan(100);
		expect(gap).toBeGreaterThanOrEqual(350); // More lenient timing
	});

	test("can be cancelled", async () => {
		const executor = new RateLimitExecutor(1, 1000);

		const promise1 = executor.exec(async () => "first");
		const promise = executor.exec(async () => "second");
		promise1.catch(noop);
		promise.catch(noop);

		executor.cancel();

		await expect(promise).rejects.toThrow();
		expect(executor.isCancelled()).toBe(true);
	});

	test("sliding window resets over time", async () => {
		const executor = new RateLimitExecutor(2, 200);

		await executor.exec(async () => 1);
		await executor.exec(async () => 2);

		// Wait for window to partially reset
		await new Promise((resolve) => setTimeout(resolve, 250));

		// Should allow new requests
		const result = await executor.exec(async () => 3);
		expect(result).toBe(3);
	});
});
