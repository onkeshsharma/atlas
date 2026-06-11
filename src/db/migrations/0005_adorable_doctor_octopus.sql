ALTER TYPE "public"."feed_event_kind" ADD VALUE 'ship-requested';--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "diff_patch" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "ship_requested_at" timestamp with time zone;