import { describe, expect, test } from "vitest";
import { CancelError } from "../src/cancellable";
import {
	auto,
	detect,
	each,
	every,
	filter,
	groupBy,
	map,
	mapValues,
	queue,
	reduce,
	reject,
	some,
	times,
	until,
	whilst,
} from "../src/functional";

describe("functional helpers", () => {
	test("map supports object input and keeps key iteration order", async () => {
		const handle = map(
			{ a: 1, b: 2, c: 3 },
			async (value, key) => `${String(key)}:${value * 2}`,
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual(["a:2", "b:4", "c:6"]);
	});

	test("filter supports object input and returns kept values", async () => {
		const handle = filter(
			{ a: 1, b: 2, c: 3, d: 4 },
			async (value, key) => value % 2 === 0 && key !== "d",
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([2]);
	});

	test("mapValues maps values while preserving keys", async () => {
		const handle = mapValues({ a: 1, b: 2, c: 3 }, async (value) => value * 2, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toEqual({
			a: 2,
			b: 4,
			c: 6,
		});
	});

	test("groupBy groups by async key selector", async () => {
		const handle = groupBy(
			[1, 2, 3, 4, 5],
			async (item) => (item % 2 === 0 ? "even" : "odd"),
			{ concurrency: 3 },
		);
		await expect(handle.promise).resolves.toEqual({
			odd: [1, 3, 5],
			even: [2, 4],
		});
	});

	test("detect resolves first matched item", async () => {
		const seen: number[] = [];
		const handle = detect(
			[1, 2, 3, 4],
			async (item) => {
				seen.push(item);
				return item > 2;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toBe(3);
		expect(seen.length).toBeGreaterThan(0);
	});

	test("detect supports object input", async () => {
		const handle = detect(
			{ c: 3, a: 1, b: 2 },
			async (value, key) => key === "b" && value === 2,
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toBe(2);
	});

	test("some returns true when any item matches", async () => {
		const handle = some([2, 4, 6, 7], async (item) => item % 2 === 1, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toBe(true);
	});

	test("some supports object input", async () => {
		const handle = some(
			{ a: 2, b: 4, c: 5 },
			async (value) => value % 2 === 1,
			{
				concurrency: 2,
			},
		);
		await expect(handle.promise).resolves.toBe(true);
	});

	test("every returns false when one item fails", async () => {
		const handle = every([2, 4, 6, 7], async (item) => item % 2 === 0, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toBe(false);
	});

	test("every supports object input", async () => {
		const handle = every(
			{ a: 2, b: 4, c: 6 },
			async (value, key) => key !== "x" && value % 2 === 0,
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toBe(true);
	});

	test("reduce supports object input", async () => {
		const handle = reduce(
			{ a: 1, b: 2, c: 3 },
			async (acc, value, key) => `${acc}${key}:${value};`,
			"",
		);
		await expect(handle.promise).resolves.toBe("a:1;b:2;c:3;");
	});

	test("each iterates object input with side effects", async () => {
		const seen: string[] = [];
		const handle = each(
			{ a: 1, b: 2, c: 3 },
			async (value, key) => {
				seen.push(`${String(key)}:${value}`);
			},
			{ concurrency: 2 },
		);
		await handle.promise;
		expect(seen).toEqual(["a:1", "b:2", "c:3"]);
	});

	test("reject removes matching values", async () => {
		const handle = reject([1, 2, 3, 4], async (item) => item % 2 === 0, {
			concurrency: 2,
		});
		await expect(handle.promise).resolves.toEqual([1, 3]);
	});

	test("times repeats iterator and preserves order", async () => {
		const handle = times(
			5,
			async (index, token) => {
				await token.sleep(2);
				return index * 2;
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual([0, 2, 4, 6, 8]);
	});

	test("whilst loops while test is true", async () => {
		let count = 0;
		const handle = whilst(
			async () => count < 3,
			async () => {
				count++;
			},
		);
		await handle.promise;
		expect(count).toBe(3);
	});

	test("until loops until test becomes true", async () => {
		let count = 0;
		const handle = until(
			async () => count >= 3,
			async () => {
				count++;
			},
		);
		await handle.promise;
		expect(count).toBe(3);
	});

	test("auto runs tasks by dependency order", async () => {
		const handle = auto(
			{
				a: async () => 1,
				b: [["a"], async (results) => (results.a as number) + 1] as const,
				c: [["a"], async (results) => (results.a as number) + 2] as const,
				d: [
					["b", "c"],
					async (results) => (results.b as number) + (results.c as number),
				] as const,
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual({ a: 1, b: 2, c: 3, d: 5 });
	});

	test("auto rejects unknown dependencies", async () => {
		const handle = auto({
			a: [["missing"], async () => 1] as const,
		});
		await expect(handle.promise).rejects.toThrow(
			'depends on unknown task "missing"',
		);
	});

	test("auto rejects dependency cycles", async () => {
		const handle = auto({
			a: [["b"], async () => 1] as const,
			b: [["a"], async () => 2] as const,
		});
		await expect(handle.promise).rejects.toThrow(
			"auto cannot resolve dependencies",
		);
	});

	test("detect respects cancellation via options.signal", async () => {
		const controller = new AbortController();
		const handle = detect(
			[1, 2, 3],
			async (_item, token) => {
				await token.sleep(1000);
				return false;
			},
			{ signal: controller.signal },
		);
		controller.abort("cancel detect");
		await expect(handle.promise).rejects.toBeInstanceOf(CancelError);
	});

	test("each respects cancellation via options.signal", async () => {
		const controller = new AbortController();
		const handle = each(
			[1, 2, 3],
			async (_item, token) => {
				await token.sleep(1000);
			},
			{ signal: controller.signal },
		);
		controller.abort("cancel each");
		await expect(handle.promise).rejects.toBeInstanceOf(CancelError);
	});
});

describe("queue abstraction", () => {
	test("queue processes tasks with configured concurrency", async () => {
		const q = queue<number, number>(async (task) => task * 2, {
			concurrency: 2,
		});
		const [a, b, c] = await Promise.all([q.push(1), q.push(2), q.push(3)]);
		expect([a, b, c]).toEqual([2, 4, 6]);
		await q.onIdle();
		expect(q.idle).toBe(true);
	});

	test("queue cancel rejects pending tasks", async () => {
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
