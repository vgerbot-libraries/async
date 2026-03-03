import { describe, expect, test } from "vitest";
import { omit } from "../../src/collections";

describe("omit", () => {
	test("omits properties where predicate returns true", async () => {
		const data = { a: 1, b: 2, c: 3, d: 4 };
		const handle = omit(data, async (value) => value % 2 === 0);
		await expect(handle.promise).resolves.toEqual({ a: 1, c: 3 });
	});

	test("returns all properties when predicate always returns false", async () => {
		const data = { a: 1, b: 2, c: 3 };
		const handle = omit(data, async () => false);
		await expect(handle.promise).resolves.toEqual({ a: 1, b: 2, c: 3 });
	});

	test("supports concurrency limit", async () => {
		const order: string[] = [];
		const data = { a: 1, b: 2, c: 3 };
		const handle = omit(
			data,
			async (value, key, token) => {
				await token.sleep(10);
				order.push(key);
				return value === 2;
			},
			{ concurrency: 1 },
		);
		await handle;
		expect(order).toEqual(["a", "b", "c"]);
	});

	test("passes key to predicate", async () => {
		const data = { a: 1, b: 2, c: 3 };
		const handle = omit(data, async (value, key) => key === "b");
		await expect(handle.promise).resolves.toEqual({ a: 1, c: 3 });
	});

	test("handles empty object", async () => {
		const handle = omit({}, async () => true);
		await expect(handle.promise).resolves.toEqual({});
	});

	test("returns empty object when all properties are omitted", async () => {
		const data = { a: 1, b: 2 };
		const handle = omit(data, async () => true);
		await expect(handle.promise).resolves.toEqual({});
	});
});
