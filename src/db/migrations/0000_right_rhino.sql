CREATE TYPE "public"."membership_role" AS ENUM('owner', 'collaborator');--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"invited_name" text,
	"welcome_note" text,
	"role" "membership_role" DEFAULT 'collaborator' NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" text,
	"revoked_at" timestamp with time zone,
	"declined_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" NOT NULL,
	"display_name" text NOT NULL,
	"handle" text,
	"initial" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "invites_token_unique" ON "invites" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_id_unique" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_one_owner" ON "memberships" USING btree ("role") WHERE "memberships"."role" = 'owner';