import type { Context } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";
import type { StreamFlavor } from "@grammyjs/stream";

export type BotContext = StreamFlavor<ConversationFlavor<Context>>;
