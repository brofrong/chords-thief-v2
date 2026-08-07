import { describe, expect, test } from "bun:test";
import { buildChordMessages } from "./chord-messages";

describe("buildChordMessages", () => {
	test("puts instructions in system and framed page text in user", () => {
		const messages = buildChordMessages(
			"System instructions here",
			"Am  C\nHello world",
		);

		expect(messages).toEqual([
			{
				role: "system",
				content: "System instructions here",
			},
			{
				role: "user",
				content: `Обработай текст страницы с аккордами и верни результат строго в формате из system prompt.

=== Входные данные ===
Am  C
Hello world`,
			},
		]);
	});

	test("trims master prompt and rejects empty page text", () => {
		expect(() => buildChordMessages("  rules  ", "   ")).toThrow(
			"Пустой текст страницы",
		);

		const messages = buildChordMessages("  rules  ", "  song  ");
		expect(messages[0]?.content).toBe("rules");
		expect(messages[1]?.content).toContain("song");
	});
});
