ALTER TYPE "public"."feed_event_kind" ADD VALUE 'consult-requested';--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "athena_location" text DEFAULT 'cloud' NOT NULL;