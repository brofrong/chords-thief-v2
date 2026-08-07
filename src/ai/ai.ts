import { OpenRouter } from "@openrouter/sdk";
import type { ChatStreamChunk } from "@openrouter/sdk/models";
import { db } from "../db";
import { err, ok, type Result } from "../types/result";
import { env } from "../utils/env";
import { mapChatChunksToText } from "./chat-stream";
import { buildChordMessages } from "./chord-messages";
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

		const masterPrompt =
			userSettings.settings.masterPrompt?.trim() || defaultMasterPrompt;
		const messages = buildChordMessages(masterPrompt, text);

		const response = await openRouter.chat.send(
			{
				chatRequest: {
					messages,
					model: userSettings.settings.aiModel || env.DEFAULT_AI_MODEL,
					maxCompletionTokens: env.MAX_COMPLETION_TOKENS,
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
		if (/missing authentication|unauthorized|invalid.*api.?key/i.test(message)) {
			return err(
				"OpenRouter не принял API-ключ. Проверь /set_api_token (нужен ключ с openrouter.ai, не команда бота)",
			);
		}
		return err(message);
	}
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
	return (
		value != null &&
		typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function"
	);
}
