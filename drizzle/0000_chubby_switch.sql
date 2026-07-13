CREATE TYPE "public"."event_type" AS ENUM('view', 'hover', 'demo-open', 'outbound-click');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"meta" jsonb,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"type" "event_type" NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"stack" jsonb NOT NULL,
	"languages" jsonb NOT NULL,
	"summary" text NOT NULL,
	"github_url" text NOT NULL,
	"preview" jsonb NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"media_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "events_ts_idx" ON "events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "events_project_ts_idx" ON "events" USING btree ("project_id","ts");