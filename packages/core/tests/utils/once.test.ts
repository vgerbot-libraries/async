import { describe, expect, test, vi } from "vitest";
import { once } from "../../src/utils/once";

describe("once", () => {
	test("executes function only once", async () => {
		let count = 0;
		const fn = once(async () => {
			count++;
			return "result";
		});

		const result1 = await fn();
		const result2 = await fn();
		const result3 = await fn();

		expect(count).toBe(1);
		expect(result1).toBe("result");
		expect(result2).toBe("result");
		expect(result3).toBe("result");
	});

	test("caches the result", async () => {
		let value = 10;
		const fn = once(async () => value);

		const result1 = await fn();
		value = 20;
		const result2 = await fn();

		expect(result1).toBe(10);
		expect(result2).toBe(10); // Cached value
	});

	test("handles errors on first call", async () => {
		let count = 0;
		const fn = once(async () => {
			count++;
			throw new Error("test error");
		});

		await expect(fn().promise).rejects.toThrow("test error");
		expect(count).toBe(1);
	});

	test("works with async operations", async () => {
		let count = 0;
		const fn = once(async (token) => {
			count++;
			await token.sleep(50);
			return "async result";
		});

		const [result1, result2] = await Promise.all([fn(), fn()]);

		expect(count).toBe(1);
		expect(result1).toBe("async result");
		expect(result2).toBe("async result");
	});
});
