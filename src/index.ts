import process from "node:process";
import { Markup, Telegraf } from "telegraf";
import z from "zod";
import { getChords } from "./ai/ai";
import { db } from "./db";
import { MessagesTable, UsersTable } from "./db/schema";
import { initGit } from "./git";
import { guard } from "./guard";
import { saveMessage } from "./save-chords";
import { fetchHtml } from "./scraping";
import { sendStream } from "./send-stream";
import { env } from "./utils/env";

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
const gitResult = await initGit();
if (gitResult?.error) {
  console.error(gitResult.error);
  process.exit(1);
}

bot.start(async (ctx) => {
  const user = ctx.message.from.id;
  const userExists = await db.query.UsersTable.findFirst({
    where: (table, { eq }) => eq(table.telegramId, user),
  });
  if (!userExists) {
    await db.insert(UsersTable).values({
      telegramId: user,
    });
  }
  ctx.reply("Пришли мне ссылку на сайт и я найду для тебя аккорды");
});

bot.action("like", async (ctx) => {
  if (!(await guard.canSave(ctx.callbackQuery.from?.id))) {
    await ctx.answerCbQuery("У тебя нет прав на сохранение");
    return;
  }

  const messageId = ctx.callbackQuery?.message?.message_id;
  if (!messageId) {
    await ctx.answerCbQuery("Error: Message not found");
    return;
  }

  const message = await db.query.MessagesTable.findFirst({
    where: (table, { eq }) => eq(table.messageId, messageId),
  });
  if (!message) {
    await ctx.answerCbQuery("Error: Message not found");
    await ctx.reply("Сообщение не найдено");
    return;
  }

  const gitResult = await saveMessage(message.AIMessage, message.originalLink);
  if (gitResult.error) {
    await ctx.answerCbQuery(gitResult.error);
    await ctx.reply("Ошибка в GIT");
    return;
  }
  const name = (gitResult as { success: { name: string } }).success.name;
  await ctx.answerCbQuery("Success");
  await ctx.reply(`Сохранено как "${name}"!`);
});

bot.on("message", async (ctx) => {
  if (!(await guard.canParse(ctx.message))) {
    await ctx.reply("У тебя нет прав на парсинг");
    return;
  }

  if ("text" in ctx.message) {
    const usersInput = ctx.message.text;
    const urlParsed = z.url().safeParse(usersInput);
    if (!urlParsed.success) {
      ctx.reply("Неверный формат ссылки \n Пример: https://www.google.com");
      return;
    }
    const reply = await ctx.reply("Начал грузить страницу");
    const html = (await fetchHtml(urlParsed.data.toString())) || "";

    const { textStream } = await getChords(html);
    const { fullMessage, reply: lastReply } = await sendStream(
      ctx,
      textStream,
      { chunkSize: 200, reply },
    );

    // Store the fullMessage with the message ID
    await db.insert(MessagesTable).values({
      messageId: lastReply.message_id,
      AIMessage: fullMessage,
      originalLink: urlParsed.data.toString(),
    });

    if (await guard.canSave(ctx.message.from?.id)) {
      ctx.telegram.editMessageReplyMarkup(
        lastReply.chat.id,
        lastReply.message_id,
        undefined,
        Markup.inlineKeyboard([Markup.button.callback("💾 save", "like")])
          .reply_markup,
      );
    }
  }
});

bot.launch();

// eslint-disable-next-line no-console
console.log("Bot is running...");
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
