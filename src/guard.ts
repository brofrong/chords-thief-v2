import type { Context } from "grammy";
import { db } from "./db";

async function canParse(ctx: Context) {
	const userId = ctx.from?.id;
	if (!userId) {
		return false;
	}
	const user = await db.query.user.findFirst({
		where: {
			AND: [
				{telegramId: userId},
				{canParse: true},
			]
		}
	}
)
	;
	return !!user;
}

export async function canSave(userId?: number) {
	if (!userId) {
		return false;
	}
	const user = await db.query.user.findFirst({
		where: {
			AND: [
				{telegramId: userId},
				{canSave: true},
			]
		}
	});
	return !!user;
}

export const guard = {
	canParse,
	canSave,
};
