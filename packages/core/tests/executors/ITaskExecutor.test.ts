import { describe, expect, test } from "vitest";
import {
	isTaskCancelOptions,
	matchesCancelRequest,
	normalizeCancelParams,
	resolveTaskOptions,
} from "../../src/executors/ITaskExecutor";

describe("ITaskExecutor helpers", () => {
	test("resolveTaskOptions trims strings and computes label", () => {
		const result = resolveTaskOptions({
			kind: "  alpha  ",
			name: "  Fetch data  ",
		});

		expect(result).toEqual({
			kind: "alpha",
			name: "Fetch data",
			label: "Fetch data",
			metadata: undefined,
		});
	});

	test("resolveTaskOptions falls back to kind for label and preserves metadata", () => {
		const metadata = { requestId: "123" };
		const result = resolveTaskOptions({
			kind: "sync",
			name: "   ",
			metadata,
		});

		expect(result).toEqual({
			kind: "sync",
			name: undefined,
			label: "sync",
			metadata,
		});
	});

	test("normalizeCancelParams derives filter and unique kinds", () => {
		const { filter, reason } = normalizeCancelParams({
			kind: [" foo ", "bar", "foo", "baz"],
			reason: "inner",
		});

		expect(reason).toBe("inner");
		expect(filter).toEqual({
			kinds: ["foo", "bar", "baz"],
			reason: "inner",
		});
	});

	test("normalizeCancelParams honours explicit reason override", () => {
		const { filter, reason } = normalizeCancelParams("outer", {
			kind: "alpha",
			reason: "inner",
		});

		expect(reason).toBe("inner");
		expect(filter).toEqual({ kinds: ["alpha"], reason: "inner" });
	});

	test("isTaskCancelOptions recognises valid option objects", () => {
		expect(isTaskCancelOptions({ kind: "alpha" })).toBe(true);
		expect(isTaskCancelOptions({ reason: "stop" })).toBe(true);
		expect(isTaskCancelOptions({})).toBe(false);
		expect(isTaskCancelOptions(null)).toBe(false);
		expect(isTaskCancelOptions("kind" as unknown)).toBe(false);
	});

	test("matchesCancelRequest verifies kinds", () => {
		const request = { kinds: ["alpha", "beta"], reason: undefined };
		expect(
			matchesCancelRequest(
				{ kind: "beta", name: undefined, label: "beta", metadata: undefined },
				request,
			),
		).toBe(true);
		expect(
			matchesCancelRequest(
				{ kind: "gamma", name: undefined, label: "gamma", metadata: undefined },
				request,
			),
		).toBe(false);
		expect(matchesCancelRequest(undefined, request)).toBe(false);
	});
});
