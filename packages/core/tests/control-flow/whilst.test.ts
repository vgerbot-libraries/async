import { describe, expect, test } from "vitest";
import { doUntil, doWhilst, until, whilst } from "../../src/control-flow";

describe("whilst", () => {
	test("loops while test is true", async () => {
		let count = 0;
		const handle = whilst(
			async () => count < 3,
			async () => {
				count++;
			},
		);
		await handle;
		expect(count).toBe(3);
	});
});

describe("until", () => {
	test("loops until test becomes true", async () => {
		let count = 0;
		const handle = until(
			async () => count >= 3,
			async () => {
				count++;
			},
		);
		await handle;
		expect(count).toBe(3);
	});
});

describe("doWhilst", () => {
	test("executes at least once then loops while test is true", async () => {
		let count = 0;
		const handle = doWhilst(
			async () => {
				count++;
			},
			async () => count < 3,
		);
		await handle;
		expect(count).toBe(3);
	});

	test("executes once even when test is initially false", async () => {
		let count = 0;
		const handle = doWhilst(
			async () => {
				count++;
			},
			async () => false,
		);
		await handle;
		expect(count).toBe(1);
	});

	test("supports cancellation", async () => {
		const controller = new AbortController();
		let count = 0;
		const handle = doWhilst(
			async (token) => {
				count++;
				if (count === 2) {
					controller.abort();
				}
				token.throwIfCancelled();
			},
			async () => count < 5,
			{ signal: controller.signal },
		);
		await expect(handle.promise).rejects.toThrow();
		expect(count).toBe(2);
	});
});

describe("doUntil", () => {
	test("executes at least once then loops until test is true", async () => {
		let count = 0;
		const handle = doUntil(
			async () => {
				count++;
			},
			async () => count >= 3,
		);
		await handle;
		expect(count).toBe(3);
	});

	test("executes once even when test is initially true", async () => {
		let count = 0;
		const handle = doUntil(
			async () => {
				count++;
			},
			async () => true,
		);
		await handle;
		expect(count).toBe(1);
	});

	test("supports token.sleep", async () => {
		let count = 0;
		const handle = doUntil(
			async (token) => {
				await token.sleep(5);
				count++;
			},
			async () => count >= 2,
		);
		await handle;
		expect(count).toBe(2);
	});
});
