# Deploy runbook

> Manual steps to run before/around a production deploy. Read this before deploying if the schema or seed content changed.

## Before deploying a schema change (migrate `main`)

The public timeline (`src/app/page.tsx`) reads the `projects` table at build time via ISR (`export const revalidate`). Vercel's production builds run against the `main` Neon branch — **`main` is never touched by the normal Slice 1/2 dev workflow** (`pnpm db:migrate`, `pnpm db:seed`, and `.env.local`'s `DATABASE_URL` all point at the `dev` branch). If `main` is missing a migration or the seed data, the build's `getPublishedProjectEntries()` call fails at prerender time.

**Incident this codifies:** on 2026-07-13, `main` had never been migrated (empty `public` schema) when the first production deploy ran, and the build hard-failed prerendering `/` with a Postgres "relation does not exist" error. `main` was migrated and seeded manually to unblock the deploy; the build-resilience fix below (so a future gap degrades instead of crashing) was added at the same time, but **migrating/seeding `main` is still a manual step you must remember**.

The `main` connection strings live in `.env.local` under **dedicated names** — `DATABASE_URL_MAIN` (pooled) and `DATABASE_URL_MAIN_UNPOOLED` (direct, for migrations) — so you **never hand-paste a connection string** (that's how the credential leaked once, and how `migrate` silently hit `dev` twice on 2026-07-17). Get them once from the Neon `main` branch → Connect (or Vercel → Production env) — they are DIFFERENT endpoints from the `dev` strings; don't reuse those.

Whenever you change `src/db/schema.ts` (a new migration) or need `main`'s `projects` table to reflect new/edited content, **before deploying**:

1. **Sanity-check the target** (read-only): for a preview-shape migration, `node scripts/verify-preview-shape.mjs main`; for any migration this doubles as a connectivity + host check. **Confirm the printed `host:` is the prod endpoint** (`ep-dry-mode-…`), NOT `ep-snowy-poetry-…` (dev). If it's dev or errors, STOP — your `.env.local` names are wrong.
2. **Apply the schema to `main`:**
   ```powershell
   pnpm db:migrate:main
   ```
   This reads `DATABASE_URL_MAIN_UNPOOLED` by name, echoes the target host (confirm it's prod again), and sets both `DATABASE_URL`/`DATABASE_URL_UNPOOLED` internally so `drizzle.config.ts`'s dotenv reload can't redirect to dev. It runs in a child process — **your shell env is never mutated**, so there's no cleanup step and no way to accidentally leave a shell pointed at `main`.
3. **Verify it actually landed on `main`** — don't trust the CLI's "success" message (see the Slice 1 `dotenv`-reload gotcha in `PROGRESS.md`, and the 2026-07-17 wrong-branch miss: a silently-wrong target still prints "success"). Check independently — Neon console → `main` → Tables, or query `information_schema`/`pg_constraint` against `main`.
4. **Seed/update `main`'s content** (only if content changed — a schema-only deploy skips this):
   ```powershell
   pnpm db:seed:main
   ```
   Reads `DATABASE_URL_MAIN` by name, echoes the host, and reuses the idempotent `db:seed` in a child process (shell env untouched).
5. Verify the row count/content on `main` (Neon console, or `select id, title, status from projects`).
6. `.env.local` always stays pointed at `dev` — the `:main` wrappers only set env inside their child process, never your shell. Nothing to clean up.
7. Redeploy (Vercel → Deployments → redeploy latest, or push a commit).

This is a **deliberate manual runbook step for now, not an automated pipeline step.** A solo/low-traffic project doesn't need `main` migrations on the automatic deploy path yet — that would put a bad migration on the same path as a routine deploy. Automating this (a gated migration job) is deferred to **Phase 4 (production hardening)**, where CI/CD pipeline work lives and can add proper safeguards (dry-run, rollback, approval gate) around it.

## Build resilience (defense in depth, added alongside this runbook)

`src/app/page.tsx` wraps its build-time `getPublishedProjectEntries()` call in a try/catch (`loadPublishedProjects()`). If the DB is unreachable, unmigrated, or has zero published rows, the page renders an empty state ("No projects to show yet — check back soon.") instead of crashing the build. This does **not** replace the runbook above — an unmigrated `main` still means the live site shows an empty timeline instead of your projects — but it does mean a DB hiccup can no longer hard-fail a deploy, and ISR backfills automatically once `main` is fixed (next revalidation, no redeploy needed).
