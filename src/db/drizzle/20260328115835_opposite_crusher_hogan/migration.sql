CREATE TABLE `messages_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`authorId` integer NOT NULL,
	`chatId` integer NOT NULL,
	`messageId` integer NOT NULL,
	`AIMessage` text NOT NULL,
	`originalLink` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`telegramId` integer NOT NULL UNIQUE,
	`canParse` integer DEFAULT false NOT NULL,
	`canSave` integer DEFAULT false NOT NULL
);
