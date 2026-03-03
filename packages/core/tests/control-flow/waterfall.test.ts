import { describe, expect, test } from "vitest";
import { waterfall } from "../../src/control-flow";

describe("waterfall", () => {
	test("passes results through pipeline", async () => {
		const handle = waterfall(
			async () => 5,
			async (n) => n * 2,
			async (n) => `Result: ${n}`,
		);
		await expect(handle.promise).resolves.toBe("Result: 10");
	});

	test("executes single task", async () => {
		const handle = waterfall(async () => 42);
		await expect(handle.promise).resolves.toBe(42);
	});

	test("supports cancellation", async () => {
		const controller = new AbortController();
		const handle = waterfall(
			async () => 1,
			async (n, token) => {
				controller.abort();
				token.throwIfCancelled();
				return n + 1;
			},
			{ signal: controller.signal },
		);
		await expect(handle.promise).rejects.toThrow();
	});

	test("chains multiple transformations", async () => {
		const handle = waterfall(
			async () => "hello",
			async (str) => str.toUpperCase(),
			async (str) => str + " WORLD",
			async (str) => str.length,
		);
		await expect(handle.promise).resolves.toBe(11);
	});

	test("handles async operations with token.sleep", async () => {
		const handle = waterfall(
			async (_, token) => {
				await token.sleep(10);
				return 1;
			},
			async (n, token) => {
				await token.sleep(10);
				return n + 1;
			},
		);
		await expect(handle.promise).resolves.toBe(2);
	});

	test("supports options as last argument", async () => {
		const handle = waterfall(
			async () => 5,
			async (n) => n * 2,
			{ name: "test-waterfall" },
		);
		await expect(handle.promise).resolves.toBe(10);
	});
});
