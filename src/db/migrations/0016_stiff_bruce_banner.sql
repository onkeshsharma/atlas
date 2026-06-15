CREATE TABLE "athena_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"project_id" uuid,
	"question" text NOT NULL,
	"options" jsonb,
	"answer_choice" text,
	"answer_text" text,
	"source" text NOT NULL,
	"confidence" real,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pruned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "athena_spend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"tier" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
