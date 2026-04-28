import { defineRelations } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { int, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const UsersTable = sqliteTable("users_table", {
	id: int().primaryKey({ autoIncrement: true }),
	telegramId: integer().notNull().unique(),
	canParse: integer({ mode: "boolean" }).notNull().default(false),
	canSave: integer({ mode: "boolean" }).notNull().default(false),
});

export const userSettingsTable = sqliteTable("user_settings_table", {
	id: int().primaryKey({ autoIncrement: true }),
	userId: int().unique().notNull().references(() => UsersTable.id),
	openRouterApiKey: text(),
	aiModel: text(),
	masterPrompt: text(),
});

export const MessagesTable = sqliteTable("messages_table", {
	id: int().primaryKey({ autoIncrement: true }),
  authorId: int().notNull(),
	chatId: int().notNull(),
	messageId: int().notNull(),
	AIMessage: text().notNull(),
	originalLink: text().notNull(),
	createdAt: int().notNull().default(sql`CURRENT_TIMESTAMP`),
});


export const relations = defineRelations({ user: UsersTable, messages: MessagesTable, userSettings: userSettingsTable }, (r) => ({
	messages: {
		author: r.one.user({
			from: r.messages.authorId,
			to: r.user.telegramId,
		}),
	},
	user: {
		settings: r.one.userSettings({
			from: r.user.id,
			to: r.userSettings.userId,
		}),
	},
}))
