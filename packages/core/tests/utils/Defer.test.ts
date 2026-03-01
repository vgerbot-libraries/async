import { describe, expect, test, vi } from "vitest";
import { Defer } from "../../src/utils/Defer";

describe("Defer", () => {
	describe("constructor", () => {
		test("should create a new Defer instance with a promise", () => {
			const defer = new Defer<number>();
			expect(defer.promise).toBeInstanceOf(Promise);
			expect(defer.isSettled).toBe(false);
		});

		test("should expose resolve and reject methods", () => {
			const defer = new Defer<number>();
			expect(typeof defer.resolve).toBe("function");
			expect(typeof defer.reject).toBe("function");
		});
	});

	describe("resolve", () => {
		test("should resolve the promise with a value", async () => {
			const defer = new Defer<number>();
			defer.resolve(42);
			await expect(defer.promise).resolves.toBe(42);
		});

		test("should set isSettled to true", () => {
			const defer = new Defer<number>();
			defer.resolve(42);
			expect(defer.isSettled).toBe(true);
		});

		test("should store the resolved value", () => {
			const defer = new Defer<number>();
			defer.resolve(42);
			expect(defer.resolveValue).toBe(42);
		});

		test("should ignore subsequent resolve calls", async () => {
			const defer = new Defer<number>();
			defer.resolve(42);
			defer.resolve(100);
			await expect(defer.promise).resolves.toBe(42);
			expect(defer.resolveValue).toBe(42);
		});

		test("should ignore resolve after reject", async () => {
			const defer = new Defer<number>();
			defer.reject(new Error("test"));
			defer.resolve(42);
			await expect(defer.promise).rejects.toThrow("test");
		});

		test("should resolve with a PromiseLike", async () => {
			const defer = new Defer<number>();
			defer.resolve(Promise.resolve(42));
			await expect(defer.promise).resolves.toBe(42);
		});
	});

	describe("reject", () => {
		test("should reject the promise with a reason", async () => {
			const defer = new Defer<number>();
			const error = new Error("test error");
			defer.reject(error);
			await expect(defer.promise).rejects.toThrow("test error");
		});

		test("should set isSettled to true", () => {
			const defer = new Defer<number>();
			defer.promise.catch(() => {
				// IGNORE
			});
			defer.reject(new Error("test"));
			expect(defer.isSettled).toBe(true);
		});

		test("should store the rejection reason", () => {
			const defer = new Defer<number>();
			const error = new Error("test");
			defer.promise.catch(() => {
				// IGNORE
			});
			defer.reject(error);
			expect(defer.rejectReason).toBe(error);
		});

		test("should ignore subsequent reject calls", async () => {
			const defer = new Defer<number>();
			const error1 = new Error("first");
			const error2 = new Error("second");
			defer.reject(error1);
			defer.reject(error2);
			await expect(defer.promise).rejects.toThrow("first");
			expect(defer.rejectReason).toBe(error1);
		});

		test("should ignore reject after resolve", async () => {
			const defer = new Defer<number>();
			defer.resolve(42);
			defer.reject(new Error("test"));
			await expect(defer.promise).resolves.toBe(42);
		});
	});

	describe("static resolve", () => {
		test("should create a pre-resolved Defer instance", async () => {
			const defer = Defer.resolve(42);
			expect(defer.isSettled).toBe(true);
			expect(defer.resolveValue).toBe(42);
			await expect(defer.promise).resolves.toBe(42);
		});
	});

	describe("static reject", () => {
		test("should create a pre-rejected Defer instance", async () => {
			const error = new Error("test");
			const defer = Defer.reject(error);
			expect(defer.isSettled).toBe(true);
			expect(defer.rejectReason).toBe(error);
			await expect(defer.promise).rejects.toThrow("test");
		});
	});

	describe("then", () => {
		test("should chain promises with then", async () => {
			const defer = new Defer<number>();
			const chained = defer.then((value) => value * 2);
			defer.resolve(21);
			await expect(chained.promise).resolves.toBe(42);
		});

		test("should return a new Defer instance", () => {
			const defer = new Defer<number>();
			const chained = defer.then((value) => value * 2);
			expect(chained).toBeInstanceOf(Defer);
			expect(chained).not.toBe(defer);
		});

		test("should handle rejection in then", async () => {
			const defer = new Defer<number>();
			const chained = defer.then(
				(value) => value * 2,
				(reason) => -1,
			);
			defer.reject(new Error("test"));
			await expect(chained.promise).resolves.toBe(-1);
		});

		test("should propagate rejection if no onrejected handler", async () => {
			const defer = new Defer<number>();
			const chained = defer.then((value) => value * 2);
			defer.reject(new Error("test"));
			await expect(chained.promise).rejects.toThrow("test");
		});

		test("should handle async transformations", async () => {
			const defer = new Defer<number>();
			const chained = defer.then(async (value) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return value * 2;
			});
			defer.resolve(21);
			await expect(chained.promise).resolves.toBe(42);
		});
	});

	describe("catch", () => {
		test("should catch rejection", async () => {
			const defer = new Defer<number>();
			const caught = defer.catch((reason) => -1);
			defer.reject(new Error("test"));
			await expect(caught.promise).resolves.toBe(-1);
		});

		test("should return a new Defer instance", () => {
			const defer = new Defer<number>();
			const caught = defer.catch(() => -1);
			expect(caught).toBeInstanceOf(Defer);
			expect(caught).not.toBe(defer);
		});

		test("should propagate resolved value", async () => {
			const defer = new Defer<number>();
			const caught = defer.catch(() => -1);
			defer.resolve(42);
			await expect(caught.promise).resolves.toBe(42);
		});

		test("should handle async error recovery", async () => {
			const defer = new Defer<number>();
			const caught = defer.catch(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return -1;
			});
			defer.reject(new Error("test"));
			await expect(caught.promise).resolves.toBe(-1);
		});
	});

	describe("finally", () => {
		test("should execute finally callback on resolve", async () => {
			const defer = new Defer<number>();
			const callback = vi.fn();
			const finalized = defer.finally(callback);
			defer.resolve(42);
			await finalized.promise;
			expect(callback).toHaveBeenCalledTimes(1);
			await expect(finalized.promise).resolves.toBe(42);
		});

		test("should execute finally callback on reject", async () => {
			const defer = new Defer<number>();
			const callback = vi.fn();
			const finalized = defer.finally(callback);
			defer.reject(new Error("test"));
			await expect(finalized.promise).rejects.toThrow("test");
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test("should return a new Defer instance", () => {
			const defer = new Defer<number>();
			const finalized = defer.finally(() => {
				// PASS
			});
			expect(finalized).toBeInstanceOf(Defer);
			expect(finalized).not.toBe(defer);
		});

		test("should not affect the resolved value", async () => {
			const defer = new Defer<number>();
			const finalized = defer.finally(() => {
				return "ignored";
			});
			defer.resolve(42);
			await expect(finalized.promise).resolves.toBe(42);
		});

		test("should not affect the rejection reason", async () => {
			const defer = new Defer<number>();
			const error = new Error("test");
			const finalized = defer.finally(() => {
				return "ignored";
			});
			defer.reject(error);
			await expect(finalized.promise).rejects.toThrow("test");
		});
	});

	describe("Symbol.toStringTag", () => {
		test("should return the same toStringTag as the underlying promise", () => {
			const defer = new Defer<number>();
			expect(defer[Symbol.toStringTag]).toBe(defer.promise[Symbol.toStringTag]);
		});
	});

	describe("complex scenarios", () => {
		test("should handle multiple chained operations", async () => {
			const defer = new Defer<number>();
			const result = defer
				.then((value) => value * 2)
				.then((value) => value + 10)
				.then((value) => value.toString());
			defer.resolve(16);
			await expect(result.promise).resolves.toBe("42");
		});

		test("should handle mixed then/catch/finally chains", async () => {
			const defer = new Defer<number>();
			const finallyCallback = vi.fn();
			const result = defer
				.then((value) => {
					if (value < 0) throw new Error("negative");
					return value * 2;
				})
				.catch(() => 0)
				.finally(finallyCallback);
			defer.resolve(21);
			await expect(result.promise).resolves.toBe(42);
			expect(finallyCallback).toHaveBeenCalledTimes(1);
		});

		test("should handle error recovery in chain", async () => {
			const defer = new Defer<number>();
			const result = defer
				.then(() => {
					throw new Error("oops");
				})
				.catch(() => 42);
			defer.resolve(0);
			await expect(result.promise).resolves.toBe(42);
		});
	});
});
