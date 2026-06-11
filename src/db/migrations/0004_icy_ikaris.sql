CREATE TYPE "public"."run_helper_kind" AS ENUM('enrich-ticket', 'draft-brief', 'ingest-project');--> statement-breakpoint
CREATE TYPE "public"."run_lane" AS ENUM('owner', 'helper');--> statement-breakpoint
CREATE TYPE "public"."brief_source" AS ENUM('helper-run', 'owner');--> statement-breakpoint
CREATE TYPE "public"."brief_status" AS ENUM('draft', 'final');--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'enriched';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'brief-drafted';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'ingested';--> statement-breakpoint
CREATE TABLE "bridges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"capabilities" jsonb,
	"last_heartbeat_at" timestamp with time zone,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "brief_status" DEFAULT 'draft' NOT NULL,
	"source" "brief_source" DEFAULT 'helper-run' NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_stdout_chunks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instance_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"run_cap" integer DEFAULT 2 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instance_settings_single_row" CHECK ("instance_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "lane" "run_lane" DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "helper_kind" "run_helper_kind";--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "brief_id" uuid;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "bridge_id" uuid;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "worktree_path" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "branch" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "queue_position" integer;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "failure_kind" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "failure_detail" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "diff_stats" jsonb;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "pr_url" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "merge_sha" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "question_history" jsonb;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_stdout_chunks" ADD CONSTRAINT "run_stdout_chunks_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "run_stdout_run_seq_unique" ON "run_stdout_chunks" USING btree ("run_id","seq");--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_bridge_id_bridges_id_fk" FOREIGN KEY ("bridge_id") REFERENCES "public"."bridges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- M9 (hand-appended, the M8 ticket_ref_seq idiom): new Run refs draw "R-<n>"
-- from this sequence inside the single-statement dispatch writes
-- (src/domain/dispatch/mutations.ts). Starts safely above the seed band (R-7..R-15).
CREATE SEQUENCE "run_ref_seq" START WITH 500;