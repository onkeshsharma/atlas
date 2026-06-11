CREATE TYPE "public"."ingest_status" AS ENUM('none', 'queued', 'ready');--> statement-breakpoint
CREATE TYPE "public"."context_term_status" AS ENUM('confirmed', 'suggested');--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'project-created';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'project-pinned';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'project-unpinned';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'context-edited';--> statement-breakpoint
CREATE TABLE "context_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"term" text NOT NULL,
	"meaning" text NOT NULL,
	"status" "context_term_status" DEFAULT 'confirmed' NOT NULL,
	"provenance" text DEFAULT 'owner' NOT NULL,
	"avoid" boolean DEFAULT false NOT NULL,
	"uses" integer,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_pins" (
	"ticket_id" uuid PRIMARY KEY NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- M7 hand-edit: drizzle-kit emits ADD COLUMN … NOT NULL, which fails on a
-- non-empty table. Add nullable → backfill from name (the same derivation
-- as src/domain/project/slug.ts) → enforce NOT NULL. (Snapshot unchanged.)
ALTER TABLE "projects" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "projects" SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')) WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "repo_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "local_path" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ingest_status" "ingest_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ingested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ingest_summary" jsonb;--> statement-breakpoint
ALTER TABLE "context_terms" ADD CONSTRAINT "context_terms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_pins" ADD CONSTRAINT "ticket_pins_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "context_terms_project_term_unique" ON "context_terms" USING btree ("project_id","term");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_unique" ON "projects" USING btree ("slug");