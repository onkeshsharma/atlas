ALTER TABLE "runs" ADD COLUMN "athena_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "afk_mode" boolean DEFAULT false NOT NULL;