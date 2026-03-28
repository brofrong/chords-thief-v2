import { OpenRouter } from "@openrouter/sdk";
import { env } from "../utils/env";
import { masterPrompt } from "./master-promt";


const openRouter = new OpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});


export async function getChords(text: string) {
	return getStream(`${masterPrompt}\n\n${text}`);
}

export async function getStream(text: string) {
	const response = openRouter.callModel({
    model: env.AI_MODEL,
    // model: 'google/gemini-3.1-pro-preview',
    input: text
  });

  return response;
}
