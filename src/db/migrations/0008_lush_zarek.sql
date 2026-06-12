ALTER TYPE "public"."feed_event_kind" ADD VALUE 'invited';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'invite-revoked';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'invite-declined';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'member-added';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'member-removed';--> statement-breakpoint
ALTER TYPE "public"."feed_event_kind" ADD VALUE 'profile-changed';--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" DEFAULT 'collaborator' NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_unique" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;