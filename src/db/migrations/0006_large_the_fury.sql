ALTER TYPE "public"."feed_event_kind" ADD VALUE 'bridge-paired';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'bridge-revoked';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'doctor-requested';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'doctor-completed';--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"frequency" text DEFAULT 'instant' NOT NULL,
	"events" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quiet_from" text,
	"quiet_until" text,
	"timezone" text,
	"email_format" text DEFAULT 'editorial' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bridges" ADD COLUMN "doctor" jsonb;--> statement-breakpoint
ALTER TABLE "bridges" ADD COLUMN "doctor_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bridges" ADD COLUMN "revoked_at" timestamp with time zone;