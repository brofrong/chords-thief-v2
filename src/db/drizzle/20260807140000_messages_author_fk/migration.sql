PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`authorId` integer NOT NULL,
	`chatId` integer NOT NULL,
	`messageId` integer NOT NULL,
	`AIMessage` text NOT NULL,
	`originalLink` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_messages_table_authorId_users_table_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users_table`(`id`)
);--> statement-breakpoint
INSERT INTO `__new_messages_table`(`id`, `authorId`, `chatId`, `messageId`, `AIMessage`, `originalLink`, `createdAt`)
SELECT m.`id`, u.`id`, m.`chatId`, m.`messageId`, m.`AIMessage`, m.`originalLink`, m.`createdAt`
FROM `messages_table` AS m
INNER JOIN `users_table` AS u ON u.`telegramId` = m.`authorId`;--> statement-breakpoint
DROP TABLE `messages_table`;--> statement-breakpoint
ALTER TABLE `__new_messages_table` RENAME TO `messages_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
