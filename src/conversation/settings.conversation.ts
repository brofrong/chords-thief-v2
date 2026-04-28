import type { Conversation } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { db } from "../db";
import { userSettingsTable } from "../db/schema";

/** Ответ `0` сбрасывает настройку (в БД пишется null). */
function textOrNull(raw: string): string | null {
  return raw.trim() === "0" ? null : raw;
}

type SettingsTextField = "openRouterApiKey" | "aiModel" | "masterPrompt";

async function updateUserTextSetting(
  conversation: Conversation,
  ctx: Context,
  options: {
    prompt: string;
    field: SettingsTextField;
    emptyReply: string;
    savedReply: (value: string) => string;
  },
) {
  await ctx.reply(options.prompt);
  const { message } = await conversation.waitFor("message:text");
  const value = textOrNull(message.text);
  const user = await db.query.user.findFirst({
    where: {
      telegramId: ctx.from?.id,
    },
  });
  if (!user) {
    await ctx.reply("Ошибка: Пользователь не найден");
    return;
  }
  const field = options.field;
  await db.insert(userSettingsTable).values({
    userId: user.id,
    [field]: value,
  }).onConflictDoUpdate({
    target: userSettingsTable.userId,
    set: { [field]: value },
  });
  await ctx.reply(
    value === null ? options.emptyReply : options.savedReply(value),
  );
}

async function setOpenRouterApiKey(conversation: Conversation, ctx: Context) {
  return updateUserTextSetting(conversation, ctx, {
    prompt: "Пришли ключ OpenRouter API",
    field: "openRouterApiKey",
    emptyReply: "Ключ сброшен",
    savedReply: (v) => `Ключ сохранен: ${v}`,
  });
}

async function setAiModel(conversation: Conversation, ctx: Context) {
  return updateUserTextSetting(conversation, ctx, {
    prompt: "Пришли модель AI",
    field: "aiModel",
    emptyReply: "Модель AI сброшена",
    savedReply: (v) => `Модель AI сохранена: ${v}`,
  });
}

async function setMasterPrompt(conversation: Conversation, ctx: Context) {
  return updateUserTextSetting(conversation, ctx, {
    prompt: "Пришли мастер промпт",
    field: "masterPrompt",
    emptyReply: "Мастер промпт сброшен",
    savedReply: (v) => `Мастер промпт сохранен: ${v}`,
  });
}

export const settingsConversation = {
  setOpenRouterApiKey,
  setAiModel,
  setMasterPrompt,
};
