import { describe, expect, test, vi } from "vitest";
import { debounce } from "../../src/utils/debounce";

describe("debounce", () => {
	test("delays execution", async () => {
		let count = 0;
		const fn = debounce(async () => {
			count++;
			return "done";
		}, 100);

		fn();
		expect(count).toBe(0);

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(count).toBe(1);
	});

	test("cancels previous calls", async () => {
		let lastValue = "";
		const fn = debounce(async (value: string) => {
			lastValue = value;
			return value;
		}, 100);

		fn("a");
		fn("b");
		fn("c");

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(lastValue).toBe("c");
	});

	test("cancel method stops execution", async () => {
		let count = 0;
		const fn = debounce(async () => {
			count++;
		}, 100);

		fn();
		fn.cancel();

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(count).toBe(0);
	});

	test("flush executes immediately", async () => {
		let count = 0;
		const fn = debounce(async () => {
			count++;
			return "flushed";
		}, 1000);

		fn();
		expect(count).toBe(0);

		fn.flush();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(count).toBe(1);
	});

	test("pending returns true when waiting", () => {
		const fn = debounce(async () => "done", 100);

		expect(fn.pending()).toBe(false);
		fn();
		expect(fn.pending()).toBe(true);
	});

	test("leading option executes immediately", async () => {
		let count = 0;
		const fn = debounce(
			async () => {
				count++;
			},
			100,
			{ leading: true, trailing: false },
		);

		fn();
		expect(count).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(count).toBe(1);
	});
});
