import { describe, expect, test } from "bun:test";
import { err, isErr, isOk, ok } from "./result";

describe("Result", () => {
	test("ok wraps value", () => {
		const result = ok({ name: "song" });
		expect(result).toEqual({ ok: true, value: { name: "song" } });
		expect(isOk(result)).toBe(true);
		expect(isErr(result)).toBe(false);
	});

	test("err wraps error", () => {
		const result = err("boom");
		expect(result).toEqual({ ok: false, error: "boom" });
		expect(isOk(result)).toBe(false);
		expect(isErr(result)).toBe(true);
	});
});
