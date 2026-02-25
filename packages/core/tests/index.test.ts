import { expect, test } from "vitest";
import { hello } from "../src/index";

test("should hello() returns 'world'", () => {
	expect(hello()).toBe("world");
});
