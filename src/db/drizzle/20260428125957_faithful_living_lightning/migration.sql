CREATE TABLE `user_settings_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`userId` integer NOT NULL,
	`openRouterApiKey` text,
	`aiModel` text,
	`masterPrompt` text,
	CONSTRAINT `fk_user_settings_table_userId_users_table_id_fk` FOREIGN KEY (`userId`) REFERENCES `users_table`(`id`)
);
