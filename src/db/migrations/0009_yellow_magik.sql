CREATE TYPE "public"."notification_kind" AS ENUM('ship', 'digest');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('composed', 'sent', 'skipped-quiet-hours', 'skipped-pref', 'failed');--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"subject" text NOT NULL,
	"html" text,
	"text" text NOT NULL,
	"status" "notification_status" DEFAULT 'composed' NOT NULL,
	"provider_id" text,
	"error" text,
	"feed_event_id" bigint,
	"ticket_id" uuid,
	"project_id" uuid,
	"period_key" text,
	"deliver_after" timestamp with time zone,
	"email_format" text DEFAULT 'editorial' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inbox_read_marks" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_read_event_id" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "reporter_user_id" text;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_feed_event_id_feed_events_id_fk" FOREIGN KEY ("feed_event_id") REFERENCES "public"."feed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_event_unique" ON "notification_outbox" USING btree ("recipient_user_id","kind","feed_event_id") WHERE "notification_outbox"."feed_event_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_period_unique" ON "notification_outbox" USING btree ("recipient_user_id","kind","period_key") WHERE "notification_outbox"."period_key" is not null;