ALTER TABLE "instance_settings" ADD COLUMN "afk_level" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "afk_fallback_minutes" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
UPDATE "instance_settings" SET "afk_level" = 'on' WHERE "afk_mode" = true;