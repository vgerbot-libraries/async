import { describe, expect, test } from "vitest";
import { AutoExecutionError, AutoTasks, auto } from "../../src/control-flow";

describe("auto", () => {
	test("runs tasks by dependency order", async () => {
		const handle = auto<{ a: number; b: number; c: number; d: number }>(
			{
				a: [[], async () => 1] as const,
				b: [["a"], async (results) => results.a + 1] as const,
				c: [["a"], async (results) => results.a + 2] as const,
				d: [["b", "c"], async (results) => results.b + results.c] as const,
			},
			{ concurrency: 2 },
		);
		await expect(handle.promise).resolves.toEqual({ a: 1, b: 2, c: 3, d: 5 });
	});

	test("reject mode returns AutoExecutionError with partial results", async () => {
		const started: string[] = [];
		const handle = auto<{
			start: string;
			slow: string;
			boom: string;
			afterBoom: string;
		}>(
			{
				start: [[], async () => "ok"] as const,
				slow: [
					["start"],
					async (_results, token) => {
						started.push("slow");
						await token.sleep(30);
						return "slow";
					},
				] as const,
				boom: [
					["start"],
					async () => {
						started.push("boom");
						throw new Error("boom");
					},
				] as const,
				afterBoom: [["boom"], async () => "never"] as const,
			},
			{ concurrency: 2 },
		);

		await expect(handle.promise).rejects.toBeInstanceOf(AutoExecutionError);

		await handle.promise.catch((error) => {
			expect(error).toBeInstanceOf(AutoExecutionError);
			const executionError = error as AutoExecutionError<
				Record<string, unknown>
			>;
			expect(executionError.taskName).toContain("boom");
			expect(executionError.partialResults).toMatchObject({
				start: "ok",
				slow: "slow",
			});
		});

		expect(started).toEqual(expect.arrayContaining(["slow", "boom"]));
		expect(started).not.toContain("afterBoom");
	});

	test("resolve mode returns partial results and error", async () => {
		const handle = auto<{ a: number; b: number; c: number; d: number }>(
			{
				a: [[], async () => 1] as const,
				b: [["a"], async (results) => results.a + 1] as const,
				c: [
					["a"],
					async () => {
						throw new Error("c failed");
					},
				] as const,
				d: [["c"], async () => 4] as const,
			},
			{ errorMode: "resolve", concurrency: 2 },
		);

		const result = await handle.promise;
		expect(result.results).toMatchObject({ a: 1, b: 2 });
		expect(result.error).toBeInstanceOf(AutoExecutionError);
		expect(result.error?.partialResults).toMatchObject({ a: 1, b: 2 });
	});

	test("rejects unknown dependencies", async () => {
		const tasks = {
			a: [["missing"], async () => 1] as const,
		} as unknown as AutoTasks<{ a: number }>;
		const handle = auto(tasks);
		await expect(handle.promise).rejects.toThrow(
			'depends on unknown task "missing"',
		);
	});

	test("rejects dependency cycles", async () => {
		const handle = auto({
			a: [["b"], async () => 1] as const,
			b: [["a"], async () => 2] as const,
		});
		await expect(handle.promise).rejects.toThrow(
			"auto cannot resolve dependencies",
		);
	});
});
