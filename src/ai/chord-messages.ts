export type ChordChatMessage = {
	role: "system" | "user";
	content: string;
};

/** Builds OpenRouter chat messages: system = instructions, user = framed page text. */
export function buildChordMessages(
	masterPrompt: string,
	pageText: string,
): ChordChatMessage[] {
	const system = masterPrompt.trim();
	const text = pageText.trim();
	if (!text) {
		throw new Error("Пустой текст страницы");
	}

	return [
		{
			role: "system",
			content: system,
		},
		{
			role: "user",
			content: `Обработай текст страницы с аккордами и верни результат строго в формате из system prompt.

=== Входные данные ===
${text}`,
		},
	];
}
