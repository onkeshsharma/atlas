CREATE TYPE "public"."ticket_kind" AS ENUM('bug', 'enhancement', 'other');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('whenever', 'soon', 'today', 'broken-now');--> statement-breakpoint
ALTER TYPE "public"."ticket_state" ADD VALUE 'needs-info';--> statement-breakpoint
ALTER TYPE "public"."ticket_state" ADD VALUE 'approved';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'linked';--> statement-breakpoint
CREATE TABLE "ticket_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_links_no_self" CHECK ("ticket_links"."blocker_id" <> "ticket_links"."blocked_id")
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "kind" "ticket_kind";--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "priority" "ticket_priority" DEFAULT 'whenever' NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "enrichment" jsonb;--> statement-breakpoint
ALTER TABLE "ticket_links" ADD CONSTRAINT "ticket_links_blocker_id_tickets_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_links" ADD CONSTRAINT "ticket_links_blocked_id_tickets_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_links_edge_unique" ON "ticket_links" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
-- M8 (hand-appended): new ticket refs draw "T-<n>" from this sequence inside the
-- single-statement file-a-ticket write (src/domain/ticket/mutations.ts). Starts
-- safely above every demo/seed ref (T-3xx band).
CREATE SEQUENCE "ticket_ref_seq" START WITH 400;