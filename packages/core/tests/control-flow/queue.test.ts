import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable";
import { queue } from "../../src/control-flow";

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

	test("supports startPaused, resume and pushMany", async () => {
		const q = queue<number, number>(async (task) => task * 3, {
			startPaused: true,
			concurrency: 0,
		});

		expect(q.paused).toBe(true);
		expect(q.length).toBe(0);
		expect(q.running).toBe(0);

		const resultsPromise = q.pushMany([1, 2, 3]);
		const idlePromise = q.onIdle();
		expect(q.length).toBe(3);
		expect(q.running).toBe(0);

		q.resume();
		await expect(resultsPromise).resolves.toEqual([3, 6, 9]);
		await idlePromise;
		expect(q.idle).toBe(true);

		// Calling resume when already resumed should be a no-op.
		q.resume();
	});

	test("uses default concurrency and tracks running count", async () => {
		let release!: () => void;
		const blocker = new Promise<void>((resolve) => {
			release = resolve;
		});
		let runningNow = 0;
		let maxRunning = 0;

		const q = queue<number, number>(async (task) => {
			runningNow += 1;
			maxRunning = Math.max(maxRunning, runningNow);
			await blocker;
			runningNow -= 1;
			return task;
		});

		const first = q.push(1);
		const second = q.push(2);
		await Promise.resolve();
		expect(q.running).toBe(1);
		expect(q.length).toBe(1);

		release();
		await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
		expect(maxRunning).toBe(1);
	});

	test("rejects push after external signal cancels queue", async () => {
		const controller = new AbortController();
		const q = queue<number, number>(async (task) => task, {
			signal: controller.signal,
		});

		controller.abort("stop from outside");
		expect(q.isCancelled()).toBe(true);

		await expect(q.push(1)).rejects.toBeInstanceOf(CancelError);
	});

	test("cancel is idempotent", async () => {
		const q = queue<number, number>(async (task) => task);
		q.cancel("first");
		expect(() => q.cancel("second")).not.toThrow();
	});

	test("pause toggles paused state", () => {
		const q = queue<number, number>(async (task) => task);
		expect(q.paused).toBe(false);
		q.pause();
		expect(q.paused).toBe(true);
	});
});
