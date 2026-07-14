# Deploy runbook

> Manual steps to run before/around a production deploy. Read this before deploying if the schema or seed content changed.

## Before deploying a schema change (migrate `main`)

The public timeline (`src/app/page.tsx`) reads the `projects` table at build time via ISR (`export const revalidate`). Vercel's production builds run against the `main` Neon branch — **`main` is never touched by the normal Slice 1/2 dev workflow** (`pnpm db:migrate`, `pnpm db:seed`, and `.env.local`'s `DATABASE_URL` all point at the `dev` branch). If `main` is missing a migration or the seed data, the build's `getPublishedProjectEntries()` call fails at prerender time.

**Incident this codifies:** on 2026-07-13, `main` had never been migrated (empty `public` schema) when the first production deploy ran, and the build hard-failed prerendering `/` with a Postgres "relation does not exist" error. `main` was migrated and seeded manually to unblock the deploy; the build-resilience fix below (so a future gap degrades instead of crashing) was added at the same time, but **migrating/seeding `main` is still a manual step you must remember**.

Whenever you change `src/db/schema.ts` (a new migration) or need `main`'s `projects` table to reflect new/edited content, **before deploying**:

1. In the Neon console, open the `main` branch → **Connect** → copy both the **pooled** and **unpooled** connection strings. These are different endpoints from the `dev` branch strings in `.env.local` — do not reuse those.
2. Apply the schema to `main` (unpooled string, since `drizzle-kit` prefers `DATABASE_URL_UNPOOLED` — see `drizzle.config.ts`):
   ```powershell
   $env:DATABASE_URL_UNPOOLED="<main-unpooled-connection-string>"
   $env:DATABASE_URL="<main-unpooled-connection-string>"
   pnpm exec drizzle-kit migrate
   ```
3. **Verify it actually landed on `main`** — don't trust the CLI's success message (see the Slice 1 `dotenv`-reload gotcha in `PROGRESS.md`: a silently-wrong target still prints "success"). Check independently, e.g. via the Neon console → `main` → Tables, or by querying `information_schema.tables` directly against the same connection string.
4. Seed/update `main`'s content (pooled string; `db:seed` only reads `DATABASE_URL`):
   ```powershell
   $env:DATABASE_URL="<main-pooled-connection-string>"
   pnpm db:seed
   ```
5. Verify the row count/content on `main` (Neon console, or a quick `select id, title, status from projects` against the pooled string).
6. **Clean up:** unset the overrides (`Remove-Item Env:\DATABASE_URL`, `Remove-Item Env:\DATABASE_URL_UNPOOLED`) or open a fresh terminal before resuming normal dev work, so you don't accidentally run a dev command against `main`. Confirm `.env.local` still points at `dev` (it's never edited by these steps — they're process-level env overrides only).
7. Redeploy (Vercel → Deployments → redeploy latest, or push a commit).

This is a **deliberate manual runbook step for now, not an automated pipeline step.** A solo/low-traffic project doesn't need `main` migrations on the automatic deploy path yet — that would put a bad migration on the same path as a routine deploy. Automating this (a gated migration job) is deferred to **Phase 4 (production hardening)**, where CI/CD pipeline work lives and can add proper safeguards (dry-run, rollback, approval gate) around it.

## Build resilience (defense in depth, added alongside this runbook)

`src/app/page.tsx` wraps its build-time `getPublishedProjectEntries()` call in a try/catch (`loadPublishedProjects()`). If the DB is unreachable, unmigrated, or has zero published rows, the page renders an empty state ("No projects to show yet — check back soon.") instead of crashing the build. This does **not** replace the runbook above — an unmigrated `main` still means the live site shows an empty timeline instead of your projects — but it does mean a DB hiccup can no longer hard-fail a deploy, and ISR backfills automatically once `main` is fixed (next revalidation, no redeploy needed).
