import process from "node:process";
import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string(),
  DEEPSEEK_TOKEN: z.string(),
  DB_FILE_NAME: z.string(),
  PATH_TO_SAVE: z.string(),
  GITHUB_TOKEN: z.string(),
});

export const env = envSchema.parse(process.env);
