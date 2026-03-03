import { describe, expect, test } from "vitest";
import { throttle } from "../../src/utils/throttle";

describe("throttle", () => {
	test("limits execution rate", async () => {
		let count = 0;
		const fn = throttle(async () => {
			count++;
		}, 100);

		fn(); // Executes immediately
		fn(); // Queued
		fn(); // Replaces queued

		expect(count).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(count).toBe(2);
	});

	test("executes on leading edge by default", async () => {
		let count = 0;
		const fn = throttle(async () => {
			count++;
		}, 100);

		fn();
		expect(count).toBe(1);
	});

	test("cancel method stops pending execution", async () => {
		let count = 0;
		const fn = throttle(async () => {
			count++;
		}, 100);

		fn(); // Executes immediately
		fn(); // Queued
		fn.cancel();

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(count).toBe(1); // Only first execution
	});

	test("flush executes pending immediately", async () => {
		let count = 0;
		const fn = throttle(async () => {
			count++;
		}, 1000);

		fn(); // Executes immediately
		fn(); // Queued
		expect(count).toBe(1);

		fn.flush();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(count).toBe(2);
	});

	test("pending returns true when waiting", () => {
		const fn = throttle(async () => "done", 100);

		fn(); // Executes immediately
		expect(fn.pending()).toBe(false);

		fn(); // Queued
		expect(fn.pending()).toBe(true);
	});

	test("respects leading and trailing options", async () => {
		let count = 0;
		const fn = throttle(
			async () => {
				count++;
			},
			100,
			{ leading: false, trailing: true },
		);

		fn();
		expect(count).toBe(0); // No leading execution

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(count).toBe(1); // Trailing execution
	});
});
