import type { Conversation } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { fetchPopularModels } from "../ai/openrouter-models";
import { db } from "../db";
import { userSettingsTable } from "../db/schema";
import { MODEL_CALLBACK_RE, buildModelKeyboard } from "./model-keyboard";

/** Ответ `0` сбрасывает настройку (в БД пишется null). */
function textOrNull(raw: string): string | null {
	const trimmed = raw.trim();
	return trimmed === "0" ? null : trimmed;
}

function looksLikeBotCommand(value: string): boolean {
	return value.startsWith("/");
}

type SettingsTextField = "openRouterApiKey" | "aiModel" | "masterPrompt";

async function saveUserSetting(
	userId: number,
	field: SettingsTextField,
	value: string | null,
) {
	await db
		.insert(userSettingsTable)
		.values({
			userId,
			[field]: value,
		})
		.onConflictDoUpdate({
			target: userSettingsTable.userId,
			set: { [field]: value },
		});
}

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
	await saveUserSetting(user.id, options.field, value);
	await ctx.reply(
		value === null ? options.emptyReply : options.savedReply(value),
	);
}

async function enterManualAiModel(
	conversation: Conversation,
	ctx: Context,
	userId: number,
) {
	await ctx.reply("Пришли модель AI (или 0 чтобы сбросить)");
	const { message } = await conversation.waitFor("message:text");
	const value = textOrNull(message.text);
	await saveUserSetting(userId, "aiModel", value);
	await ctx.reply(
		value === null ? "Модель AI сброшена" : `Модель AI сохранена: ${value}`,
	);
}

async function setOpenRouterApiKey(conversation: Conversation, ctx: Context) {
	await ctx.reply("Пришли ключ OpenRouter API (или 0 чтобы сбросить)");

	while (true) {
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

		if (value !== null && looksLikeBotCommand(value)) {
			await ctx.reply(
				"Это похоже на команду бота, а не на API-ключ. Пришли ключ с openrouter.ai (или 0 чтобы сбросить)",
			);
			continue;
		}

		await saveUserSetting(user.id, "openRouterApiKey", value);
		await ctx.reply(
			value === null
				? "Ключ сброшен"
				: `Ключ сохранен: ${value.length <= 8 ? "••••" : `${value.slice(0, 4)}…${value.slice(-4)}`}`,
		);
		return;
	}
}

async function setAiModel(conversation: Conversation, ctx: Context) {
	const user = await db.query.user.findFirst({
		where: {
			telegramId: ctx.from?.id,
		},
		with: {
			settings: true,
		},
	});
	if (!user) {
		await ctx.reply("Ошибка: Пользователь не найден");
		return;
	}

	const apiKey = user.settings?.openRouterApiKey ?? null;
	let models: Awaited<ReturnType<typeof fetchPopularModels>> = [];
	try {
		models = await conversation.external(() => fetchPopularModels(apiKey));
	} catch {
		await ctx.reply(
			"Не удалось загрузить список моделей OpenRouter. Введи модель вручную.",
		);
		return enterManualAiModel(conversation, ctx, user.id);
	}

	if (models.length === 0) {
		await ctx.reply("Список моделей пуст. Введи модель вручную.");
		return enterManualAiModel(conversation, ctx, user.id);
	}

	let page = 0;
	await ctx.reply("Выбери модель:", {
		reply_markup: buildModelKeyboard(models, page),
	});

	while (true) {
		const cbCtx = await conversation.waitForCallbackQuery(MODEL_CALLBACK_RE, {
			otherwise: async (c) => {
				if (c.callbackQuery) {
					await c.answerCallbackQuery({
						text: "Выбор устарел, вызови /set_ai_model ещё раз",
						show_alert: true,
					});
				} else {
					await c.reply("Нажми кнопку выше или вызови /set_ai_model ещё раз");
				}
			},
		});

		const data = cbCtx.callbackQuery.data;
		await cbCtx.answerCallbackQuery();

		if (data === "mdlmanual") {
			return enterManualAiModel(conversation, cbCtx, user.id);
		}

		if (data.startsWith("mdlpage:")) {
			page = Number(data.slice("mdlpage:".length));
			if (!Number.isFinite(page) || page < 0) {
				await cbCtx.reply("Выбор устарел, вызови /set_ai_model ещё раз");
				return;
			}
			await cbCtx.editMessageReplyMarkup({
				reply_markup: buildModelKeyboard(models, page),
			});
			continue;
		}

		if (data.startsWith("mdl:")) {
			const index = Number(data.slice("mdl:".length));
			const model = models[index];
			if (!model) {
				await cbCtx.reply("Выбор устарел, вызови /set_ai_model ещё раз");
				return;
			}
			await saveUserSetting(user.id, "aiModel", model.id);
			await cbCtx.reply(`Модель AI сохранена: ${model.id}`);
			return;
		}
	}
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
