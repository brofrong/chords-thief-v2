import { InlineKeyboard } from "grammy";
import z from "zod";
import { getChords } from "../ai/ai";
import { db } from "../db";
import { MessagesTable } from "../db/schema";
import { guard } from "../middleware/guard";
import { fetchHtml } from "../services/scrape";
import type { BotContext } from "../types/context";
import { isOk } from "../types/result";
import { env } from "../utils/env";

const saveKeyboard = new InlineKeyboard().text("Сохранить", "save");

export async function urlHandler(ctx: BotContext) {
	if (!(await guard.canParse(ctx))) {
		await ctx.reply("У тебя нет прав на парсинг");
		return;
	}

	if (!ctx.message || !("text" in ctx.message) || !ctx.message.text) {
		await ctx.reply("Пришли текстовую ссылку");
		return;
	}

	const urlParsed = z.url().safeParse(ctx.message.text);
	if (!urlParsed.success) {
		await ctx.reply("Неверный формат ссылки\nПример: https://www.amdm.ru/...");
		return;
	}

	const telegramId = ctx.from?.id;
	if (!telegramId) {
		await ctx.reply("Error: User not found");
		return;
	}

	const chatId = ctx.chat?.id;
	if (!chatId) {
		await ctx.reply("Error: Chat not found");
		return;
	}

	const user = await db.query.user.findFirst({
		where: { telegramId },
	});
	if (!user) {
		await ctx.reply("Сначала нажми /start");
		return;
	}

	const status = await ctx.reply("Начал грузить страницу");
	const page = await fetchHtml(urlParsed.data.toString(), {
		timeoutMs: env.FETCH_TIMEOUT_MS,
		maxBytes: env.FETCH_MAX_BYTES,
		maxHtmlKb: env.HTML_MAX_KB,
	});
	if (!isOk(page)) {
		await ctx.api.editMessageText(status.chat.id, status.message_id, page.error);
		return;
	}

	await ctx.api.editMessageText(
		status.chat.id,
		status.message_id,
		"Генерирую текст...",
	);

	const chordsResult = await getChords(telegramId, page.value);
	if (!isOk(chordsResult)) {
		await ctx.reply(`Ошибка: ${chordsResult.error}`);
		return;
	}

	try {
		const aiResponse = chordsResult.value;
		const lastReply = await ctx.replyWithStream(aiResponse.getTextStream());
		await ctx.api.deleteMessage(status.chat.id, status.message_id);

		const lastMessageId = lastReply.at(-1)?.message_id;
		if (!lastMessageId) {
			await ctx.reply("Error: Message not found");
			return;
		}

		await db.insert(MessagesTable).values({
			authorId: user.id,
			chatId,
			messageId: lastMessageId,
			AIMessage: await aiResponse.getText(),
			originalLink: urlParsed.data.toString(),
		});

		await ctx.api.editMessageReplyMarkup(chatId, lastMessageId, {
			reply_markup: saveKeyboard,
		});
	} catch (error) {
		console.error(error);
		const message =
			error instanceof Error ? error.message : "Неизвестная ошибка генерации";
		await ctx.reply(`Ошибка: ${message.slice(0, 200)}`);
	}
}
