import { db } from "../db";
import { saveMessage } from "../save-chords";
import { guard } from "../middleware/guard";
import { isOk } from "../types/result";
import type { BotContext } from "../types/context";

export async function saveCallbackHandler(ctx: BotContext) {
	if (!(await guard.canSave(ctx.callbackQuery?.from?.id))) {
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
			messageId,
			chatId,
		},
	});
	if (!message) {
		await ctx.answerCallbackQuery("Error: Message not found");
		await ctx.reply("Сообщение не найдено");
		return;
	}

	const saveResult = await saveMessage(message.AIMessage, message.originalLink);
	if (!isOk(saveResult)) {
		await ctx.answerCallbackQuery("save error");
		await ctx.reply(`Ошибка в сохранении ${saveResult.error}`);
		return;
	}

	await ctx.reply(`Сохранено как "${saveResult.value.name}"!`);
	await ctx.answerCallbackQuery("Success");
}
