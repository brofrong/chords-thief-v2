import { CommandGroup } from "@grammyjs/commands";
import { version } from "../../package.json";
import { db } from "../db";
import type { BotContext } from "../types/context";

function maskSecret(value: string | null | undefined): string {
	if (!value) return "Not set";
	if (value.length <= 8) return "••••";
	return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function createSettingsCommandGroup() {
	const group = new CommandGroup<BotContext>();

	group.command(
		"set_api_token",
		"Set OpenRouter API Token",
		async (ctx) => await ctx.conversation.enter("setOpenRouterApiKey"),
	);
	group.command(
		"set_ai_model",
		"Set AI Model",
		async (ctx) => await ctx.conversation.enter("setAiModel"),
	);
	group.command(
		"set_master_prompt",
		"Set Master Prompt",
		async (ctx) => await ctx.conversation.enter("setMasterPrompt"),
	);
	group.command("show_settings", "Show Settings", async (ctx) => {
		const userSettings = await db.query.user.findFirst({
			where: {
				telegramId: ctx.from?.id,
			},
			with: {
				settings: true,
			},
		});
		if (!userSettings) {
			await ctx.reply("Error: User settings not found");
			return;
		}
		await ctx.reply(
			[
				`версия: ${version}`,
				`OpenRouter API Token: ${maskSecret(userSettings.settings?.openRouterApiKey)}`,
				`AI Model: ${userSettings.settings?.aiModel ?? "Not set"}`,
				`Master Prompt: ${userSettings.settings?.masterPrompt ?? "Not set"}`,
			].join("\n"),
		);
	});

	return group;
}
