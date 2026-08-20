import { autoRetry } from "@grammyjs/auto-retry";
import {
	conversations,
	createConversation,
} from "@grammyjs/conversations";
import { stream } from "@grammyjs/stream";
import { Bot } from "grammy";
import process from "node:process";
import { version } from "../package.json";
import { settingsConversation } from "./conversation/settings.conversation";
import { initAdmin } from "./db/init-admin";
import { saveCallbackHandler } from "./handlers/save";
import { createSettingsCommandGroup } from "./handlers/settings";
import { startHandler } from "./handlers/start";
import { urlHandler } from "./handlers/url";
import type { BotContext } from "./types/context";
import { env } from "./utils/env";

function startHealthServer(port: number) {
	return Bun.serve({
		port,
		fetch() {
			return new Response("ok", {
				headers: { "content-type": "text/plain" },
			});
		},
	});
}

export async function createBot() {
	const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
	bot.api.config.use(autoRetry());
	bot.use(stream());
	bot.use(conversations());

	bot.use(createConversation(settingsConversation.setOpenRouterApiKey));
	bot.use(createConversation(settingsConversation.setAiModel));
	bot.use(createConversation(settingsConversation.setMasterPrompt));

	const settingsCommands = createSettingsCommandGroup();
	bot.use(settingsCommands);
	await settingsCommands.setCommands(bot);

	await initAdmin();

	bot.command("start", startHandler);
	bot.callbackQuery("save", saveCallbackHandler);
	bot.on("message::url", urlHandler);

	bot.catch(async (error) => {
		const adminId = env.ADMIN_ID;
		if (!adminId) {
			console.error("ADMIN_ID is not set");
			console.error(error);
			return;
		}
		await bot.api.sendMessage(adminId, `Error: ${error.message}`);
		console.error(error);
	});

	return bot;
}

export async function startBot() {
	const health = startHealthServer(env.HEALTH_PORT);
	const bot = await createBot();

	bot.start();
	console.log(`Bot is running v${version}... (health :${health.port})`);

	const stop = () => {
		bot.stop();
		health.stop(true);
	};
	process.once("SIGINT", stop);
	process.once("SIGTERM", stop);

	return { bot, health };
}
