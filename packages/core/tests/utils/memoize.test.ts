import { describe, expect, test } from "vitest";
import { memoize } from "../../src/utils";

describe("memoize", () => {
	test("caches results for same arguments", async () => {
		let callCount = 0;
		const fn = memoize(async (n: number) => {
			callCount++;
			return n * 2;
		});

		const result1 = await fn(5);
		const result2 = await fn(5);

		expect(result1).toBe(10);
		expect(result2).toBe(10);
		expect(callCount).toBe(1);
	});

	test("calls function again for different arguments", async () => {
		let callCount = 0;
		const fn = memoize(async (n: number) => {
			callCount++;
			return n * 2;
		});

		await fn(5);
		await fn(10);

		expect(callCount).toBe(2);
	});

	test("supports custom resolver", async () => {
		let callCount = 0;
		const fn = memoize(
			async (a: number, b: number) => {
				callCount++;
				return a + b;
			},
			{
				resolver: (a, b) => `${a}:${b}`,
			},
		);

		const result1 = await fn(1, 2);
		const result2 = await fn(1, 2);
		const result3 = await fn(2, 1);

		expect(result1).toBe(3);
		expect(result2).toBe(3);
		expect(result3).toBe(3);
		expect(callCount).toBe(2);
	});

	test("exposes cache for manual manipulation", async () => {
		const fn = memoize(async (n: number) => n * 2);

		await fn(5);
		expect(fn.cache.has("5")).toBe(true);
		expect(fn.cache.get("5")).toBe(10);

		fn.cache.clear();
		expect(fn.cache.has("5")).toBe(false);
	});

	test("handles token parameter", async () => {
		const fn = memoize(async (n: number, token) => {
			await token.sleep(10);
			return n * 2;
		});

		const result = await fn(5);
		expect(result).toBe(10);
	});

	test("caches complex return values", async () => {
		let callCount = 0;
		const fn = memoize(async (id: number) => {
			callCount++;
			return { id, name: `User ${id}` };
		});

		const user1 = await fn(1);
		const user2 = await fn(1);

		expect(user1).toEqual({ id: 1, name: "User 1" });
		expect(user2).toEqual({ id: 1, name: "User 1" });
		expect(callCount).toBe(1);
	});

	test("handles no arguments", async () => {
		let callCount = 0;
		const fn = memoize(async () => {
			callCount++;
			return "result";
		});

		await fn();
		await fn();

		expect(callCount).toBe(1);
	});
});
