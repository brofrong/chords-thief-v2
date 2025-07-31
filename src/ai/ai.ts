import { createDeepSeek } from "@ai-sdk/deepseek";
import { streamText } from "ai";
import { env } from "../utils/env";
import { masterPrompt } from "./master-promt";

const deepseek = createDeepSeek({
  apiKey: env.DEEPSEEK_TOKEN,
});

export async function getChords(text: string) {
  return streamText({
    model: deepseek("deepseek-chat"),
    prompt: `${masterPrompt}\n\n${text}`,
  });
}

export async function TestStream(text: string) {
  return streamText({
    model: deepseek("deepseek-chat"),
    prompt: text,
  });
}
