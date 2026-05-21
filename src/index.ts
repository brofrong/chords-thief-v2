import { autoRetry } from "@grammyjs/auto-retry";
import { stream, type StreamFlavor } from "@grammyjs/stream";
import { Bot, Context, InlineKeyboard } from "grammy";
import process from "node:process";
import z from "zod";
import { getChords } from "./ai/ai";
import { db } from "./db";
import { initAdmin } from './db/init-admin';
import { MessagesTable, UsersTable } from "./db/schema";
import { guard } from "./guard";
import { saveMessage } from "./save-chords";
import { fetchHtml } from "./scraping";
import { env } from "./utils/env";
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { settingsConversation } from "./conversation/settings.conversation";
import { CommandGroup } from "@grammyjs/commands";

type BotContext = StreamFlavor<ConversationFlavor<Context>>;

const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
bot.api.config.use(autoRetry());
bot.use(stream());
bot.use(conversations());

bot.use(createConversation(settingsConversation.setOpenRouterApiKey));
bot.use(createConversation(settingsConversation.setAiModel));
bot.use(createConversation(settingsConversation.setMasterPrompt));

const settingsCommandGroup = new CommandGroup<BotContext>();

settingsCommandGroup.command("set_api_token", "Set OpenRouter API Token", async (ctx) => await ctx.conversation.enter("setOpenRouterApiKey"));
settingsCommandGroup.command("set_ai_model", "Set AI Model", async (ctx) => await ctx.conversation.enter("setAiModel"));
settingsCommandGroup.command("set_master_prompt", "Set Master Prompt", async (ctx) => await ctx.conversation.enter("setMasterPrompt"));
settingsCommandGroup.command("show_settings", "Show Settings", async (ctx) => {
	const userSettings = await db.query.user.findFirst({
		where: {
			telegramId: ctx.from?.id,
		},
		with: {
			settings: true,
		}
	});
	if (!userSettings) {
		await ctx.reply("Error: User settings not found");
		return;
	}
	await ctx.reply(`OpenRouter API Token: ${userSettings.settings?.openRouterApiKey ?? "Not set"}\nAI Model: ${userSettings.settings?.aiModel ?? "Not set"}\nMaster Prompt: ${userSettings.settings?.masterPrompt ?? "Not set"}`);
	});

bot.use(settingsCommandGroup);
await settingsCommandGroup.setCommands(bot); 

initAdmin();

const keyboard = new InlineKeyboard().text('Сохранить', 'save');


bot.command('start', async (ctx) => {
	const user = ctx.message?.from?.id;
	if (!user) {
		await ctx.reply("Error: User not found");
		return;
	}
	const userExists = await db.query.user.findFirst({
		where: {
			telegramId: user,
		},
	});
	if (!userExists) {
		await db.insert(UsersTable).values({
			telegramId: user,
		});
	}
	ctx.reply("Пришли мне ссылку на сайт и я найду для тебя аккорды");
});


bot.callbackQuery('save', async (ctx) => {
  	if (!(await guard.canSave(ctx.callbackQuery.from?.id))) {
       await ctx.answerCallbackQuery("У тебя нет прав на сохранение");
       await ctx.reply("У тебя нет прав на сохранение");
       return;
	}
  await ctx.reply("Saving to file...");


	const messageId = ctx.callbackQuery?.message?.message_id;
	const chatId = ctx.callbackQuery?.message?.chat.id;
	if (!messageId || !chatId) {
		await ctx.answerCallbackQuery("Error: Message not found");
		await ctx.reply("Сообщение не найдено");
		return;
	}

	const message = await db.query.messages.findFirst({
		where: {
			messageId: messageId,
			chatId: chatId,
		},
	});
	if (!message) {
		await ctx.answerCallbackQuery("Error: Message not found");
		await ctx.reply("Сообщение не найдено");
		return;
	}

	const gitResult = await saveMessage(message.AIMessage, message.originalLink);
	if (gitResult.error) {
		await ctx.answerCallbackQuery("save error");
		await ctx.reply(`Ошибка в сохранении ${gitResult.error}`);
		return;
	}
	const name = (gitResult as { success: { name: string } }).success.name;
	await ctx.reply(`Сохранено как "${name}"!`);
	await ctx.answerCallbackQuery("Success");
});

bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

bot.on("message::url", async (ctx) => {
	if (!(await guard.canParse(ctx))) {
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
    
    await ctx.api.editMessageText(reply.chat.id, reply.message_id, "Генерирую текст...");

		const chordsResult = await getChords(ctx.from?.id, html);
		console.log(chordsResult);
		if (!chordsResult.success) {	
			await ctx.reply("Error: " + JSON.stringify(chordsResult.error).slice(0, 200));
			return;
		}
		const  aiResponse = await chordsResult.aiResponse;
		try {
			const lastReply = await ctx.replyWithStream(aiResponse.getTextStream());
			await ctx.api.deleteMessage(reply.chat.id, reply.message_id);
			const lastMessageId = lastReply.at(-1)?.message_id;
			if (!lastMessageId) {
				await ctx.reply("Error: Message not found");
				return;
			}

				// Store the fullMessage with the message ID
		await db.insert(MessagesTable).values({
      authorId: ctx.from?.id,
			chatId: ctx.chat.id,
			messageId: lastMessageId,
			AIMessage: await aiResponse.getText(),
			originalLink: urlParsed.data.toString(),
		});

    // Add keyboard to the last message
    await ctx.api.editMessageReplyMarkup(ctx.chatId, lastMessageId, {
      reply_markup: keyboard,
    })
	
		} catch (error) {
			console.error(error);
			await ctx.reply("Error: " + JSON.stringify(error).slice(0, 200));
			return;
		}
	}
});

bot.catch(async (error) => {
  const adminId = env.ADMIN_ID;
  if (!adminId) {
    console.error("ADMIN_ID is not set");
    return;
  }
  //send admin message about error
  await bot.api.sendMessage(adminId, `Error: ${error.message}`);
	console.error(error);
});


bot.start();


// eslint-disable-next-line no-console
console.log("Bot is running...");
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
