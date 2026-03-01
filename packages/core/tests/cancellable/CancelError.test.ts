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
	});
});
