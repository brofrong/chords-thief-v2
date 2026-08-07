import { OpenRouter } from "@openrouter/sdk";
import type { ChatStreamChunk } from "@openrouter/sdk/models";
import { db } from "../db";
import { err, ok, type Result } from "../types/result";
import { env } from "../utils/env";
import { mapChatChunksToText } from "./chat-stream";
import { defaultMasterPrompt } from "./master-promt";

export async function getChords(
	telegramUserId: number | undefined,
	text: string,
	signal?: AbortSignal,
): Promise<Result<AsyncIterable<string>>> {
	if (!telegramUserId) {
		return err("Пользователь не найден");
	}

	const userSettings = await db.query.user.findFirst({
		with: {
			settings: true,
		},
		where: {
			telegramId: telegramUserId,
		},
	});

	if (!userSettings?.settings) {
		return err(
			"Настройки пользователя не найдены. Сначала /start и /set_api_token",
		);
	}
	if (!userSettings.settings.openRouterApiKey) {
		return err("OpenRouter API key не задан. Команда: /set_api_token");
	}

	try {
		const openRouter = new OpenRouter({
			apiKey: userSettings.settings.openRouterApiKey,
		});

		const response = await openRouter.chat.send(
			{
				chatRequest: {
					messages: [
						{
							role: "system",
							content:
								userSettings.settings.masterPrompt || defaultMasterPrompt,
						},
						{
							role: "user",
							content: text,
						},
					],
					model: userSettings.settings.aiModel || env.DEFAULT_AI_MODEL,
					stream: true,
				},
			},
			{ signal },
		);

		if (!isAsyncIterable<ChatStreamChunk>(response)) {
			return err("OpenRouter вернул не-stream ответ");
		}

		return ok(mapChatChunksToText(response, signal));
	} catch (error) {
		if (signal?.aborted) {
			return err("Генерация отменена");
		}
		const message =
			error instanceof Error ? error.message : "Ошибка OpenRouter";
		return err(message);
	}
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
	return (
		value != null &&
		typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function"
	);
}
