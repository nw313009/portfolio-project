CREATE TYPE "public"."preview_type" AS ENUM('webapp', 'cli', 'service', 'library', 'notebook', 'media');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "preview" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_owner" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_repo" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "primary_language" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stars" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "topics" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_pushed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "homepage_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "metadata_fetched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "demo_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_type" "preview_type";--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_github_owner_repo_unique" UNIQUE("github_owner","github_repo");