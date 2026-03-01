import { describe, expect, test } from "vitest";
import { CancelError } from "../../src/cancellable";

describe("CancelError", () => {
	test("should create a CancelError with message and reason", () => {
		const reason = "user cancelled";
		const error = new CancelError("Task canceled", reason);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("CancelError");
		expect(error.message).toBe("Task canceled");
		expect(error.reason).toBe(reason);
		expect(error.rawReason).toBe(reason);
	});

	test("should normalize an Error reason and preserve reason stack", () => {
		const reason = new Error("boom");
		const error = CancelError.fromReason("Task canceled", reason);
		expect(error.reason).toBe(reason);
		expect(error.rawReason).toBe(reason);
		expect(error.reasonStack).toBe(reason.stack);
		expect((error as Error & { cause?: unknown }).cause).toBe(reason);
		expect(error.stack).toContain("--- Cancellation raw reason stack ---");
		expect(error.stack).toContain("Error: boom");
	});

	test("should attach reject-site stack while preserving cause stack", () => {
		const reason = new Error("origin");
		const base = CancelError.fromReason("Task canceled", reason);
		const decorated = base.withRejectionSite();
		expect(decorated).toBeInstanceOf(CancelError);
		expect(decorated.reasonStack).toBe(reason.stack);
		expect(decorated.rejectionStack).toContain("Cancel rejection boundary");
		expect(decorated.stack).toContain("--- Cancellation rejection site ---");
		expect(decorated.stack).toContain("--- Cancellation raw reason stack ---");
	});
});
