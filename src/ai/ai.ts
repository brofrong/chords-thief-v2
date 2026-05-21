import { OpenRouter } from "@openrouter/sdk";
import type { ChatStreamingResponseChunk } from "@openrouter/sdk/models";
import { db } from "../db";
import { env } from "../utils/env";
import { defaultMasterPrompt } from "./master-promt";

/** Matches usage in `index.ts`: stream to Telegram, then read full text once buffered. */
export type ChordsStreamResponse = {
	getTextStream(): AsyncIterable<string>;
	getText(): Promise<string>;
};

export async function getChords(
	telegramUserId: number,
	text: string,
): Promise<
	| { success: false; error: string }
	| { success: true; aiResponse: Promise<ChordsStreamResponse> }
> {
	const userSettings = await db.query.user.findFirst({
		with: {
			settings: true,
		},
		where: {
			telegramId: telegramUserId,
		},
	});

	if (!userSettings?.settings) {
		return { error: "User settings not found", success: false };
	}
	if (!userSettings.settings?.openRouterApiKey) {
		return { error: "OpenRouter API key not found", success: false };
	}

	return {
		success: true,
		aiResponse: getStream(
			text,
			userSettings.settings.masterPrompt,
			userSettings.settings.openRouterApiKey,
			userSettings.settings.aiModel,
		),
	};
}

function wrapStreamingChatResponse(
	stream: AsyncIterable<ChatStreamingResponseChunk>,
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

	// const input = masterPrompt
	// 	? `${masterPrompt}\n\n${text}`
	// 	: `${defaultMasterPrompt}\n\n${text}`;

	const response = await openRouter.chat.send({
		chatGenerationParams: {
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

	return wrapStreamingChatResponse(response);
}
