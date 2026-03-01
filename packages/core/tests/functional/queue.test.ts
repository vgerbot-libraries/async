import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable";
import { queue } from "../../src/functional";

describe("queue", () => {
	test("processes tasks with configured concurrency", async () => {
		const q = queue<number, number>(async (task) => task * 2, {
			concurrency: 2,
		});
		const [a, b, c] = await Promise.all([q.push(1), q.push(2), q.push(3)]);
		expect([a, b, c]).toEqual([2, 4, 6]);
		await q.onIdle();
		expect(q.idle).toBe(true);
	});

	test("cancel rejects pending tasks", async () => {
		const q = queue<number, number>(
			async (task, token) => {
				await token.sleep(1000);
				return task;
			},
			{ concurrency: 1 },
		);

		const first = q.push(1);
		const second = q.push(2);
		q.cancel("stop queue");

		await expect(first).rejects.toBeInstanceOf(CancelError);
		await expect(second).rejects.toBeInstanceOf(CancelError);
	});
});
