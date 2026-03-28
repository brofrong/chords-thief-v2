import { defineRelations } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { int, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const UsersTable = sqliteTable("users_table", {
	id: int().primaryKey({ autoIncrement: true }),
	telegramId: integer().notNull().unique(),
	canParse: integer({ mode: "boolean" }).notNull().default(false),
	canSave: integer({ mode: "boolean" }).notNull().default(false),
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


export const relations = defineRelations({ user: UsersTable, messages: MessagesTable }, (r) => ({
	messages: {
		author: r.one.user({
			from: r.messages.authorId,
			to: r.user.telegramId,
		}),
	}
}))
