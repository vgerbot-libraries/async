import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable";

describe("CancelError", () => {
	test("should create a CancelError with message and reason", () => {
		const reason = "user cancelled";
		const error = new CancelError("Task canceled", { reason });
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("CancelError");
		expect(error.message).toBe("Task canceled");
		expect(error.reason).toBe(reason);
		expect(error.rawReason).toBe(reason);
	});

	test("should set cause to raw Error reason via fromReason", () => {
		const reason = new Error("boom");
		const error = CancelError.fromReason("Task canceled", reason);
		expect(error.reason).toBe(reason);
		expect(error.rawReason).toBe(reason);
		expect(error.cause).toBe(reason);
	});

	test("should chain cause via withRejectionSite", () => {
		const reason = new Error("origin");
		const base = CancelError.fromReason("Task canceled", reason);
		const decorated = base.withRejectionSite();

		expect(decorated).toBeInstanceOf(CancelError);
		expect(decorated.reason).toBe(reason);
		expect(decorated.cause).toBe(base);
		expect((decorated.cause as CancelError).cause).toBe(reason);
	});

	test("should return existing CancelError from fromReason", () => {
		const existing = new CancelError("already", { reason: "r" });
		expect(CancelError.fromReason("wrap", existing)).toBe(existing);
	});

	test("should handle undefined reason", () => {
		const error = CancelError.fromReason("no reason", undefined);
		expect(error.reason).toBeUndefined();
		expect(error.cause).toBeUndefined();
	});

	test("should handle non-Error, non-string reason", () => {
		const reason = { code: 42 };
		const error = CancelError.fromReason("obj reason", reason);
		expect(error.reason).toBe(reason);
		expect(error.cause).toBe(reason);
	});
});
