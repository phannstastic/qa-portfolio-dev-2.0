ALTER TABLE `contacts` MODIFY COLUMN `message` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `experiences` MODIFY COLUMN `start_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `experiences` MODIFY COLUMN `end_date` date;