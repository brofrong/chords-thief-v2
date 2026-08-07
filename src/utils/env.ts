import process from "node:process";
import { z } from "zod";

const envSchema = z.object({
	TELEGRAM_BOT_TOKEN: z.string().min(1),
	DB_FILE_NAME: z.string().default("./db/db.sqlite"),
	PATH_TO_SAVE: z.string().default("./chords"),
	ADMIN_ID: z.coerce.number().optional(),
	DEFAULT_AI_MODEL: z.string().default("openai/gpt-5.3-codex"),
	HEALTH_PORT: z.coerce.number().default(8080),
	HTML_MAX_KB: z.coerce.number().default(100),
	FETCH_TIMEOUT_MS: z.coerce.number().default(15_000),
	FETCH_MAX_BYTES: z.coerce.number().default(2 * 1024 * 1024),
});

export const env = envSchema.parse(process.env);
