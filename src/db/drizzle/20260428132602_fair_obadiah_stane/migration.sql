PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_settings_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`userId` integer NOT NULL UNIQUE,
	`openRouterApiKey` text,
	`aiModel` text,
	`masterPrompt` text,
	CONSTRAINT `fk_user_settings_table_userId_users_table_id_fk` FOREIGN KEY (`userId`) REFERENCES `users_table`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_user_settings_table`(`id`, `userId`, `openRouterApiKey`, `aiModel`, `masterPrompt`) SELECT `id`, `userId`, `openRouterApiKey`, `aiModel`, `masterPrompt` FROM `user_settings_table`;--> statement-breakpoint
DROP TABLE `user_settings_table`;--> statement-breakpoint
ALTER TABLE `__new_user_settings_table` RENAME TO `user_settings_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;