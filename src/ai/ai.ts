import { OpenRouter } from "@openrouter/sdk";
import { db } from "../db";
import { env } from "../utils/env";
import { defaultMasterPrompt } from './master-promt';
import type { ModelResult } from "@openrouter/sdk/lib/model-result.js";

export async function getChords(telegramUserId: number, text: string): Promise<{ success: false, error: string} |{ success: true, aiResponse: Promise<ModelResult<any>> }> {
  const userSettings = await db.query.user.findFirst({
    with: {
      settings: true,
    },
    where: {
      telegramId: telegramUserId,
    },
  });

  if (!userSettings?.settings) {
    return {error: "User settings not found", success: false};
  }
  if (!userSettings.settings?.openRouterApiKey) {
    return {error: "OpenRouter API key not found", success: false};
  }

	return { success: true, aiResponse: getStream(text, userSettings.settings.masterPrompt, userSettings.settings.openRouterApiKey, userSettings.settings.aiModel) };
}

export async function getStream(text: string , masterPrompt: string | null, openRouterApiKey: string, aiModel: string | null) {
  const openRouter = new OpenRouter({
    apiKey: openRouterApiKey,
  });
  
  const input = masterPrompt ? `${masterPrompt}\n\n${text}` : `${defaultMasterPrompt}\n\n${text}`;
	const response = openRouter.callModel({
    model: aiModel || env.DEFAULT_AI_MODEL,
    input
  });

  return response;
}
