import { describe, expect, test } from "vitest";
import { pick } from "../../src/collections";

describe("pick", () => {
	test("picks properties where predicate returns true", async () => {
		const data = { a: 1, b: 2, c: 3, d: 4 };
		const handle = pick(data, async (value) => value % 2 === 0);
		await expect(handle.promise).resolves.toEqual({ b: 2, d: 4 });
	});

	test("returns empty object when no properties match", async () => {
		const data = { a: 1, b: 3, c: 5 };
		const handle = pick(data, async (value) => value % 2 === 0);
		await expect(handle.promise).resolves.toEqual({});
	});

	test("supports concurrency limit", async () => {
		const order: string[] = [];
		const data = { a: 1, b: 2, c: 3 };
		const handle = pick(
			data,
			async (value, key, token) => {
				await token.sleep(10);
				order.push(key);
				return value > 1;
			},
			{ concurrency: 1 },
		);
		await handle;
		expect(order).toEqual(["a", "b", "c"]);
	});

	test("passes key to predicate", async () => {
		const data = { a: 1, b: 2, c: 3 };
		const handle = pick(data, async (value, key) => key === "b");
		await expect(handle.promise).resolves.toEqual({ b: 2 });
	});

	test("handles empty object", async () => {
		const handle = pick({}, async () => true);
		await expect(handle.promise).resolves.toEqual({});
	});

	test("picks all properties when predicate always returns true", async () => {
		const data = { a: 1, b: 2, c: 3 };
		const handle = pick(data, async () => true);
		await expect(handle.promise).resolves.toEqual({ a: 1, b: 2, c: 3 });
	});
});
