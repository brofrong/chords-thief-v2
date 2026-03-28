import process from "node:process";
import { z } from "zod";

const envSchema = z.object({
	TELEGRAM_BOT_TOKEN: z.string(),
	OPENROUTER_API_KEY: z.string(),
	DB_FILE_NAME: z.string().default('db.sqlite'),
	PATH_TO_SAVE: z.string().default('./chords'),
  ADMIN_ID: z.coerce.number().optional(),
  AI_MODEL: z.string().default('openai/gpt-5.3-codex'),
});

export const env = envSchema.parse(process.env);
