# Build Progress

> The agent reads this first every session to find the CURRENT phase, and updates it after each slice. One phase at a time. Full phase specs live in `docs/phases/PHASES.md`; architecture rationale in `docs/ARCHITECTURE.md`.

**CURRENT PHASE: 2 — Dynamic + metrics**

## Phase status
- [x] **Phase 1 — Timeline frontend** (Next.js scaffold, timeline UI, iframe/media previews, deploy to Vercel)
- [ ] Phase 2 — Dynamic + metrics (Neon + Drizzle, Auth.js admin, GitHub ingestion, events)
- [ ] Phase 3 — Python/FastAPI backend + AI, deploy service to AWS
- [ ] Phase 4 — Production hardening (observability, audit log, rate limits, CI/CD)
- [ ] Phase 5 — Scale/enterprise polish

## Phase 1 checklist
- [x] App scaffolded (Next.js 15 App Router, TS strict, Tailwind, shadcn/ui, motion)
- [x] Typed `Project` zod schema with discriminated `preview` union
- [x] 3+ sample projects as MDX across different previewTypes
- [x] Vertical center-line timeline, alternating cards, scroll-driven line draw
- [x] Cards enter on scroll; oldest at top; paginated/lazy (not one giant DOM)
- [x] Preview on hover: iframe for `webapp` demos; media/snippet for other types
- [x] Responsive (mobile single rail) + dark mode + reduced-motion
- [x] Test Gate green (typecheck, lint, build, Playwright acceptance checks)
- [x] Deployed to Vercel

## Phase 2 checklist — Slice 1 (Data layer)
- [x] Neon Postgres + Drizzle ORM wired (`drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`)
- [x] Schema: `projects`, append-only `events` (indexed on `ts` and `(projectId, ts)`, no FKs — archival-friendly), `audit_log` (`src/db/schema.ts`)
- [x] Neon driver split: `drizzle-orm/neon-http` for reads (`src/db/client.ts`, `DATABASE_URL` pooled), `drizzle-orm/neon-serverless` WS `Pool` reserved for transactional writes (`src/db/tx-client.ts`, same pooled `DATABASE_URL` — PgBouncer transaction-mode pooling supports transactions); `drizzle-kit` migrations use `DATABASE_URL_UNPOOLED` (`drizzle.config.ts`)
- [x] Migration generated and committed (`drizzle/0000_chubby_switch.sql`) and applied cleanly to both the Neon `dev` branch and a separate, disposable Neon `test` branch (confirmed via `information_schema` — distinct compute endpoints, tables present on both)
- [x] Unit tests (`src/db/mappers.test.ts`) + integration tests (`src/db/queries.integration.test.ts`, `describe.skipIf` when no DB configured) — integration tests run for real against the Neon `test` branch, not skipped, not mocked
- [x] Row↔entity mappers with Zod validation (`src/db/mappers.ts`), typed query helpers (`src/db/queries.ts`)

## Phase 2 checklist — Slice 2 (Read path on the DB)
- [x] Seed script (`scripts/seed-projects.ts`, `pnpm db:seed`) upserts the 4 existing MDX projects (via Velite's build output, `@/lib/content`) into the `projects` table as `status: "published"`; idempotent (`upsertProject`'s `onConflictDoUpdate` by `id`), safe to re-run after editing MDX
- [x] Public read helpers added to `src/db/queries.ts`: `upsertProject` (idempotent insert-or-update, `updatedAt` refreshed via the DB's own `now()` clock, not `new Date()`, to avoid client/server clock-skew bugs), `getPublishedProjects` (published-only, `orderBy(asc(startDate))`), `getPublishedProjectEntries` (mapped + re-validated through `projectRowToEntry`/`projectSchema`)
- [x] Public timeline (`src/app/page.tsx`) is now an async Server Component reading `getPublishedProjectEntries()` via the `neon-http` client (`src/db/client.ts`, Slice 1's driver split) instead of `@/lib/content`'s MDX/Velite export; `export const revalidate = 3600` drives ISR — the route has no dynamic APIs (no cookies/headers/searchParams), so it stays statically prerendered and served from cache with **no auth on the read path**, just regenerated in the background at most hourly
- [x] Phase 1 UI/animations/responsive/dark-mode behavior preserved exactly — only `page.tsx`'s data source changed; `Timeline`/`ProjectCard`/preview components untouched
- [x] New integration tests (`src/db/queries.integration.test.ts`): `upsertProject` idempotency (second call updates, doesn't duplicate), `getPublishedProjects` excludes `draft` rows and orders `published` rows oldest-`startDate`-first
- [x] `e2e/timeline.spec.ts` (unchanged assertions, header comment updated) re-verified against the DB-backed production build — same 4 projects, same order, each `previewType` still renders correctly, confirming the read path swap didn't change behavior
- [x] Test Gate green end-to-end: `pnpm db:seed` (seeds Neon `dev` branch) → `pnpm typecheck && pnpm lint && pnpm build && pnpm test` → `pnpm test:e2e`, all passing

## Decisions & deviations (append-only log)
- Preview strategy: live iframe of deployed demo for web apps; recorded media/snippets for cli/service/library/notebook/media. No arbitrary-repo builds.
- Hosting: Vercel for frontend; AWS enters only with the FastAPI service (Phase 3).
- Backend: Python/FastAPI, introduced in Phase 2→3 (metrics can start in Next.js route handlers; FastAPI owns AI + heavier analytics).
- Animation: used `motion` (the maintained successor package) in place of `framer-motion`, per current Context7 docs — same API (`useScroll`, `whileInView`), imported from `motion/react`.
- Content: Velite (not Content Collections) generates a typed content layer from MDX, validated against `projectSchema` at build time; `strict: true` fails the build on invalid frontmatter/payloads (covered by an integration test in `test/fixtures/velite-invalid-content`).
- Schema hardening: `projectSchema` uses `z.strictObject()` throughout and a `previewType`-discriminated union so each preview variant only carries its own fields (e.g. a `cli` project cannot also hold `demoUrl`); `webapp.demoUrl` is required, matching the `<Preview>` exhaustiveness check in Slice 5.
- Dark mode: `next-themes` with `attribute="class"`, matching shadcn's existing `.dark` CSS-variable block and `@custom-variant dark` in `globals.css` — no extra Tailwind config needed.
- Pagination: client-side, `PAGE_SIZE = 6`, revealed via an `IntersectionObserver` sentinel at the end of the mounted list (not a real network fetch). The 4 shipped sample projects don't exceed one page, so this is exercised by a dedicated unit test with synthetic data rather than visibly in the current content set.
- Mobile single rail: implemented via responsive `grid-template-columns` + explicit `col-start`/`row-start` per breakpoint on the existing alternating-side markup, not by duplicating or hiding cards — every project card still mounts exactly once regardless of viewport.
- Phase 2 infra: Neon branching for test/dev/prod DBs; Vercel Blob for capture media (S3 in Phase 3, behind storagePut()); Upstash Redis for /api/events rate-limiting. All serverless, no AWS.
- Slice 1: lazy Drizzle client init via `Proxy` (`src/db/client.ts`, `src/db/tx-client.ts`) so importing `@/db/queries` never throws at module-load time when `DATABASE_URL` is unset — only an actual query does. This lets `queries.integration.test.ts` load and `describe.skipIf` cleanly instead of crashing the whole test file when run without a DB configured.
- Slice 1 gotcha (fixed): `drizzle-kit`'s own `dotenv` reload inside `drizzle.config.ts` refills any `.env.local`-defined var that isn't already present in `process.env` — so `scripts/db-migrate-test.mjs` must set both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the test branch's URL (not just delete the latter), or the reload silently redirects migrations back to the `dev` branch while still reporting success.
- Slice 2: ISR via the page-level `export const revalidate` route-segment config (Context7-confirmed this works for any Server Component, not just `fetch`-based data) rather than `unstable_cache` — simpler for a single top-level read, and this route has no per-request dynamic APIs so it's still fully static + revalidated. On-demand cache-busting (`revalidateTag`/`revalidatePath` fired from an admin write) is deferred to Slice 4, when writes exist.
- Slice 2: since ISR bakes the page at build time from whatever's in the DB, the Test Gate must run `pnpm db:seed` (against the Neon `dev` branch) *before* `pnpm build`, or the prerendered page reflects an empty/stale table. `predb:seed` runs `velite` first so the seed always reads fresh MDX-derived content.
- Slice 2: `upsertProject`'s `updatedAt` is set via `sql\`now()\`` (the Postgres server's own clock) rather than a Node.js `new Date()` — mixing the two clock sources caused a flaky integration-test assertion (`inserted.updatedAt < updated.updatedAt`) under real client/server clock skew against Neon.
- Slice 2 environment gotcha (not a code fix, noted for future sessions): this Windows/PowerShell dev environment does not have `node`/`npm`/`pnpm` on `PATH` by default in every new shell, and Playwright's browser binaries were not yet installed (`pnpm exec playwright install chromium`) — both silently or confusingly broke `pnpm test:e2e` (instant per-test failures, hung child processes) despite `typecheck`/`lint`/`build`/`test` all running fine. Resolved for this session; if `test:e2e` fails oddly again, check `node -v`/`pnpm -v` and the Playwright browser cache first.

## Changelog
- 2026-07-11 — Slices 1–5 (scaffold, content schema, static timeline, scroll motion, preview components) implemented and verified across earlier sessions; see chat history for per-slice detail. Test Gate green at each step.
- 2026-07-11 — Slice 6: dark mode (`next-themes` + `ThemeToggle`), responsive single-rail mobile layout, and client-side pagination (`PAGE_SIZE = 6` behind an `IntersectionObserver` sentinel) added to `Timeline`. New unit tests for `ThemeToggle` and pagination behavior. Test Gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test && pnpm test:e2e` — all green (56 unit tests, 1 E2E test).
- 2026-07-11 — Slice 7: added `e2e/timeline.spec.ts` covering the Phase 1 acceptance criteria (date-ordered cards, scroll-driven line draw, scroll-revealed card, hover-mounted sandboxed webapp iframe, non-webapp card never renders an iframe, mobile single-rail geometry, zero console errors). Production build verified Vercel-ready. Test Gate: all green (56 unit tests, 8 E2E tests). Phase 1 complete pending Vercel deploy (manual, deployment steps provided to the user).
- 2026-07-13 — Phase 2, Slice 1 (Data layer): Neon + Drizzle wired; `projects`/`events`/`audit_log` schema defined and migrated to both a Neon `dev` branch and a separate disposable `test` branch (`drizzle/0000_chubby_switch.sql`, committed); `events` indexed on `ts` + `(projectId, ts)`, no FKs (archival-friendly); `neon-http`/`neon-serverless` driver split wired against `DATABASE_URL`/`DATABASE_URL_UNPOOLED`/`TEST_DATABASE_URL`. Test Gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test` — all green, 14 test files / 66 tests, integration tests running for real against the Neon test branch (not skipped).
- 2026-07-13 — Phase 2, Slice 2 (Read path on DB): added `upsertProject`/`getPublishedProjects`/`getPublishedProjectEntries` to `src/db/queries.ts`; new idempotent seed script (`scripts/seed-projects.ts`, `pnpm db:seed`, `tsx` added as a dev dependency) migrates the 4 MDX projects into the Neon `dev` branch as `published`; `src/app/page.tsx` is now an async Server Component reading from the DB via `neon-http` with `export const revalidate = 3600` (ISR, no auth on the read path); Phase 1 UI/animations/responsive/dark-mode preserved exactly, only the data source changed. Test Gate: `pnpm db:seed` → `pnpm typecheck && pnpm lint && pnpm build && pnpm test` (69 tests, all green, incl. new upsert-idempotency + published/draft-ordering integration tests) → `pnpm test:e2e` (8/8 green against the DB-backed production build — same 4 projects, same oldest-first order, every `previewType` still renders correctly).

## Backlog / deferred (not scheduled)
- [ ] Events retention/archival: move old `events` rows to cold storage (S3/Parquet) or roll up into aggregates on a schedule. Deferred — no traffic yet. Phase 2 must keep the schema archival-friendly (indexed timestamp, partition-friendly, no FKs that block deleting old rows) so this stays a background job later, not a migration.
