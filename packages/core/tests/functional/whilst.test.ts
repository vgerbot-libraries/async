import { describe, expect, test } from "vitest";
import { until, whilst } from "../../src/functional";

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
