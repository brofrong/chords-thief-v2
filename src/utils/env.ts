import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string(),
  DEEPSEEK_TOKEN: z.string(),
});

export const env = envSchema.parse(process.env);
