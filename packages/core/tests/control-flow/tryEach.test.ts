import { describe, expect, test } from "vitest";
import { tryEach } from "../../src/control-flow/tryEach";

describe("tryEach", () => {
	test("returns first successful result", async () => {
		const handle = tryEach([
			async () => {
				throw new Error("fail 1");
			},
			async () => {
				throw new Error("fail 2");
			},
			async () => "success",
		]);

		await expect(handle.promise).resolves.toBe("success");
	});

	test("throws last error if all fail", async () => {
		const handle = tryEach([
			async () => {
				throw new Error("fail 1");
			},
			async () => {
				throw new Error("fail 2");
			},
			async () => {
				throw new Error("fail 3");
			},
		]);

		await expect(handle.promise).rejects.toThrow("fail 3");
	});

	test("returns first task if it succeeds", async () => {
		let count = 0;
		const handle = tryEach([
			async () => {
				count++;
				return "first";
			},
			async () => {
				count++;
				return "second";
			},
		]);

		await expect(handle.promise).resolves.toBe("first");
		expect(count).toBe(1); // Only first task executed
	});

	test("tries tasks in sequence", async () => {
		const order: number[] = [];
		const handle = tryEach([
			async () => {
				order.push(1);
				throw new Error("fail");
			},
			async () => {
				order.push(2);
				throw new Error("fail");
			},
			async () => {
				order.push(3);
				return "success";
			},
		]);

		await handle;
		expect(order).toEqual([1, 2, 3]);
	});

	test("throws error for empty array", async () => {
		const handle = tryEach([]);
		await expect(handle.promise).rejects.toThrow(
			"tryEach requires at least one task",
		);
	});

	test("can be cancelled", async () => {
		const handle = tryEach([
			async (token) => {
				await token.sleep(100);
				return "done";
			},
		]);

		handle.cancel();
		await expect(handle.promise).rejects.toThrow();
	});
});
