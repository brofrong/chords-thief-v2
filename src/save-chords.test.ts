import { describe, expect, test } from "bun:test";
import { getSongName } from "./save-chords";

describe("getSongName", () => {
	test("reads title after #", () => {
		expect(getSongName("#Кино - Группа крови\n\nAm")).toBe(
			"Кино - Группа крови",
		);
	});

	test("falls back when missing", () => {
		expect(getSongName("no title")).toBe("Неизвестное название");
	});
});
