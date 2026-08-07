import type { BotContext } from "../types/context";
import { db } from "../db";
import { UsersTable } from "../db/schema";

export async function startHandler(ctx: BotContext) {
	const telegramId = ctx.from?.id;
	if (!telegramId) {
		await ctx.reply("Error: User not found");
		return;
	}

	const existing = await db.query.user.findFirst({
		where: { telegramId },
	});

	if (!existing) {
		await db.insert(UsersTable).values({ telegramId });
	}

	await ctx.reply("Пришли мне ссылку на сайт и я найду для тебя аккорды");
}
