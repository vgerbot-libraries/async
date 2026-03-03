import { describe, expect, test } from "vitest";
import { cache, cachify } from "../../src/utils/cache";

describe("cache aliases", () => {
	test("cache is an alias for memoize", async () => {
		let count = 0;
		const fn = cache(async (x: number) => {
			count++;
			return x * 2;
		});

		await fn(5);
		await fn(5);

		expect(count).toBe(1);
	});

	test("cachify is an alias for memoize", async () => {
		let count = 0;
		const fn = cachify(async (x: number) => {
			count++;
			return x * 2;
		});

		await fn(5);
		await fn(5);

		expect(count).toBe(1);
	});

	test("both aliases have cache property", () => {
		const fn1 = cache(async (x: number) => x);
		const fn2 = cachify(async (x: number) => x);

		expect(fn1.cache).toBeDefined();
		expect(fn2.cache).toBeDefined();
	});
});
