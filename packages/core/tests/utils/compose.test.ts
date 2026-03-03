import { describe, expect, test } from "vitest";
import { compose, seq } from "../../src/utils";

describe("compose", () => {
	test("composes functions right to left", async () => {
		const addOne = async (n: number) => n + 1;
		const double = async (n: number) => n * 2;
		const square = async (n: number) => n * n;

		const composed = compose(square, double, addOne);
		const result = await composed(5);

		// (5 + 1) * 2 = 12, 12 * 12 = 144
		expect(result).toBe(144);
	});

	test("composes single function", async () => {
		const addOne = async (n: number) => n + 1;
		const composed = compose(addOne);
		const result = await composed(5);

		expect(result).toBe(6);
	});

	test("supports cancellation", async () => {
		const controller = new AbortController();
		const fn1 = async (n: number) => n + 1;
		const fn2 = async (n: number, token) => {
			controller.abort();
			token.throwIfCancelled();
			return n * 2;
		};

		const composed = compose(fn2, fn1);
		const handle = composed(5, { signal: controller.signal });

		await expect(handle.promise).rejects.toThrow();
	});

	test("handles type transformations", async () => {
		const numToString = async (n: number) => String(n);
		const addExclamation = async (s: string) => s + "!";

		const composed = compose(addExclamation, numToString);
		const result = await composed(42);

		expect(result).toBe("42!");
	});

	test("passes token through pipeline", async () => {
		const fn1 = async (n: number, token) => {
			await token.sleep(10);
			return n + 1;
		};
		const fn2 = async (n: number, token) => {
			await token.sleep(10);
			return n * 2;
		};

		const composed = compose(fn2, fn1);
		const result = await composed(5);

		expect(result).toBe(12);
	});
});

describe("seq", () => {
	test("composes functions left to right", async () => {
		const addOne = async (n: number) => n + 1;
		const double = async (n: number) => n * 2;
		const square = async (n: number) => n * n;

		const sequenced = seq(addOne, double, square);
		const result = await sequenced(5);

		// (5 + 1) * 2 = 12, 12 * 12 = 144
		expect(result).toBe(144);
	});

	test("composes single function", async () => {
		const addOne = async (n: number) => n + 1;
		const sequenced = seq(addOne);
		const result = await sequenced(5);

		expect(result).toBe(6);
	});

	test("executes in visual order", async () => {
		const order: number[] = [];
		const fn1 = async (n: number) => {
			order.push(1);
			return n + 1;
		};
		const fn2 = async (n: number) => {
			order.push(2);
			return n * 2;
		};
		const fn3 = async (n: number) => {
			order.push(3);
			return n * n;
		};

		const sequenced = seq(fn1, fn2, fn3);
		await sequenced(5);

		expect(order).toEqual([1, 2, 3]);
	});

	test("supports cancellation", async () => {
		const controller = new AbortController();
		const fn1 = async (n: number) => n + 1;
		const fn2 = async (n: number, token) => {
			controller.abort();
			token.throwIfCancelled();
			return n * 2;
		};

		const sequenced = seq(fn1, fn2);
		const handle = sequenced(5, { signal: controller.signal });

		await expect(handle.promise).rejects.toThrow();
	});

	test("handles type transformations", async () => {
		const numToString = async (n: number) => String(n);
		const addExclamation = async (s: string) => s + "!";

		const sequenced = seq(numToString, addExclamation);
		const result = await sequenced(42);

		expect(result).toBe("42!");
	});

	test("passes token through pipeline", async () => {
		const fn1 = async (n: number, token) => {
			await token.sleep(10);
			return n + 1;
		};
		const fn2 = async (n: number, token) => {
			await token.sleep(10);
			return n * 2;
		};

		const sequenced = seq(fn1, fn2);
		const result = await sequenced(5);

		expect(result).toBe(12);
	});
});
