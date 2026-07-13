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

## Changelog
- 2026-07-11 — Slices 1–5 (scaffold, content schema, static timeline, scroll motion, preview components) implemented and verified across earlier sessions; see chat history for per-slice detail. Test Gate green at each step.
- 2026-07-11 — Slice 6: dark mode (`next-themes` + `ThemeToggle`), responsive single-rail mobile layout, and client-side pagination (`PAGE_SIZE = 6` behind an `IntersectionObserver` sentinel) added to `Timeline`. New unit tests for `ThemeToggle` and pagination behavior. Test Gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test && pnpm test:e2e` — all green (56 unit tests, 1 E2E test).
- 2026-07-11 — Slice 7: added `e2e/timeline.spec.ts` covering the Phase 1 acceptance criteria (date-ordered cards, scroll-driven line draw, scroll-revealed card, hover-mounted sandboxed webapp iframe, non-webapp card never renders an iframe, mobile single-rail geometry, zero console errors). Production build verified Vercel-ready. Test Gate: all green (56 unit tests, 8 E2E tests). Phase 1 complete pending Vercel deploy (manual, deployment steps provided to the user).
- 2026-07-13 — Phase 2, Slice 1 (Data layer): Neon + Drizzle wired; `projects`/`events`/`audit_log` schema defined and migrated to both a Neon `dev` branch and a separate disposable `test` branch (`drizzle/0000_chubby_switch.sql`, committed); `events` indexed on `ts` + `(projectId, ts)`, no FKs (archival-friendly); `neon-http`/`neon-serverless` driver split wired against `DATABASE_URL`/`DATABASE_URL_UNPOOLED`/`TEST_DATABASE_URL`. Test Gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test` — all green, 14 test files / 66 tests, integration tests running for real against the Neon test branch (not skipped).

## Backlog / deferred (not scheduled)
- [ ] Events retention/archival: move old `events` rows to cold storage (S3/Parquet) or roll up into aggregates on a schedule. Deferred — no traffic yet. Phase 2 must keep the schema archival-friendly (indexed timestamp, partition-friendly, no FKs that block deleting old rows) so this stays a background job later, not a migration.
