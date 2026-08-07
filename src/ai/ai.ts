import { OpenRouter } from "@openrouter/sdk";
import type { ChatStreamChunk } from "@openrouter/sdk/models";
import { db } from "../db";
import { err, ok, type Result } from "../types/result";
import { env } from "../utils/env";
import { defaultMasterPrompt } from "./master-promt";

/** Matches usage in handlers: stream to Telegram, then read full text once buffered. */
export type ChordsStreamResponse = {
	getTextStream(): AsyncIterable<string>;
	getText(): Promise<string>;
};

export async function getChords(
	telegramUserId: number | undefined,
	text: string,
): Promise<Result<ChordsStreamResponse>> {
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
		return err("Настройки пользователя не найдены. Сначала /start и /set_api_token");
	}
	if (!userSettings.settings.openRouterApiKey) {
		return err("OpenRouter API key не задан. Команда: /set_api_token");
	}

	try {
		const aiResponse = await getStream(
			text,
			userSettings.settings.masterPrompt,
			userSettings.settings.openRouterApiKey,
			userSettings.settings.aiModel,
		);
		return ok(aiResponse);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Ошибка OpenRouter";
		return err(message);
	}
}

function wrapStreamingChatResponse(
	stream: AsyncIterable<ChatStreamChunk>,
): ChordsStreamResponse {
	let fullText = "";

	return {
		async *getTextStream() {
			for await (const chunk of stream) {
				const delta = chunk.choices[0]?.delta?.content;
				if (delta) {
					fullText += delta;
					yield delta;
				}
			}
		},
		async getText() {
			return fullText;
		},
	};
}

export async function getStream(
	text: string,
	masterPrompt: string | null,
	openRouterApiKey: string,
	aiModel: string | null,
): Promise<ChordsStreamResponse> {
	const openRouter = new OpenRouter({
		apiKey: openRouterApiKey,
	});

	const response = await openRouter.chat.send({
		chatRequest: {
			messages: [
				{
					role: "system",
					content: masterPrompt || defaultMasterPrompt,
				},
				{
					role: "user",
					content: text,
				},
			],
			model: aiModel || env.DEFAULT_AI_MODEL,
			stream: true,
		},
	});

	return wrapStreamingChatResponse(
		response as AsyncIterable<ChatStreamChunk>,
	);
}
