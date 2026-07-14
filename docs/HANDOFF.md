# HANDOFF — read this first to resume with full context

**Purpose of this file:** let a new assistant chat pick up exactly where the last one left off, with the reasoning intact — not just *what* we're building but *why* each decision was made. Read this, then `docs/ARCHITECTURE.md`, `docs/phases/PHASES.md`, and `docs/PROGRESS.md` (the live state).

## Who I am / working style
Solo developer, building a portfolio site, implementing via Cursor AI agents. New to the external tooling (Neon, Vercel, Upstash, OAuth) — the assistant should give exact click-by-click steps for any external tool and never assume prior familiarity. I work phase-by-phase, plan-then-implement, and want the assistant to technically architect and direct (elite system-level thinking) while Cursor does the implementation. Move fast, but gate every stage with tests. I use Cursor Ultra (cost is not a constraint on model choice).

## What we're building (the goal, from the start)
A portfolio site that (1) proves elite frontend engineering (Next.js 15 + TypeScript), (2) reads as a vertical center-line timeline — oldest project at top, scroll-driven, paginated, modern UX/UI, (3) grows a Python/FastAPI backend + AI that lets visitors interact with projects and tracks those interactions as metrics. Admin (me) can add projects via GitHub link with previews; public visitors need no login. End goal includes hover previews of projects and an admin/public split.

## Decisions already locked (and the reasoning)
- **Ship order:** beautiful frontend first (Vercel), backend/AI later — a modular monolith, NOT premature microservices. The Python/FastAPI service is introduced only when AI gives it a real job (Phase 3). Reasoning: a solo dev shipping microservices early spends all their time on infra instead of shipping.
- **Preview strategy:** live **iframe of my deployed demo** for web apps; recorded media / snippets for other project types. Projects span MANY languages, so preview is a **typed discriminated union** on `previewType` (webapp|cli|service|library|notebook|media) — a Rust CLI can't be iframed like a Next.js app. Hard invariant: **never execute untrusted repo code on our infra** (that's building your own Vercel — security/ops sinkhole). Evaluated DIY sandboxed builds vs managed microVMs vs browser execution and chose iframe for blast-radius + effort reasons.
- **Hosting:** Vercel now; AWS enters only with the FastAPI service (Phase 3).
- **Stack:** Next.js 15 App Router + TS strict + Tailwind + shadcn/ui + framer-motion; Neon Postgres + Drizzle; Auth.js v5; Playwright previews. Phase 2 also adds Vercel Blob (media) + Upstash Redis (rate limiting) — all serverless, scale-to-zero, free-tier, no AWS.
- **Models in Cursor:** Sonnet 5 default, Opus 4.8 for architectural/reasoning-heavy slices (schema design, authZ middleware, ingestion error handling).

## How we keep Cursor on-goal (the governance system)
- `.cursor/rules/00-north-star.mdc` — always-apply: goal + hard invariants + operating protocol (work one phase at a time; Plan mode scoped to current phase; test gate after each slice; update PROGRESS; STOP at phase boundary).
- `.cursor/rules/10-frontend-conventions.mdc` — scoped to src/**.
- `docs/phases/PHASES.md` — the spec per phase: goal, in-scope, **out-of-scope guards**, definition of done, test gate, kickoff prompt, suggested model, locked infra decisions, Context7-verified patterns.
- `docs/PROGRESS.md` — live state; a fresh Cursor agent reads it first every session.
- **Rhythm:** fresh Cursor chat per slice; each slice ends with a green Test Gate (`pnpm typecheck && lint && build && test` + Playwright), PROGRESS updated, then a pause. I report the result to the assistant, who reviews it against the slice's Definition of Done before I continue.

## MCPs configured in Cursor
Context7 (current API docs — auto-invoked), Playwright (visual verification + preview capture), AWS (Phase 3 only — keep OFF until then), Figma (only for a specific design slice — keep OFF otherwise). Tool-cap discipline: past ~40 tools Cursor degrades, so only enable what the current phase needs.

## Where we are RIGHT NOW
- **Phase 1: COMPLETE** — timeline frontend built, tested, deployed to Vercel.
- **Phase 2: IN PROGRESS.**
  - **Slice 1 (data layer): COMPLETE + committed.** Neon + Drizzle; tables projects/events/audit_log; events.ts and events.(projectId,ts) indexed; events has NO FK to projects (archival-friendly). Driver split wired (neon-http reads / neon-serverless Pool transactional writes). Integration tests run for real against the Neon **test** branch. Gotcha caught: drizzle-kit's dotenv reload silently redirected the test-branch migration back to dev while reporting success — verify against information_schema directly; fix committed.
  - **Slice 2 (read path on DB): COMPLETE + accepted.** page.tsx is now an async Server Component reading getPublishedProjectEntries() via neon-http instead of MDX; ISR via `export const revalidate = 3600`; public read path stays static/cached, no auth. Idempotent seed (`pnpm db:seed`, onConflictDoUpdate). Presentation untouched. Gate green: typecheck/lint/build/test (69/69) + e2e (8/8) against the DB-backed build. Bugs fixed: top-level await in seed under CJS; clock skew between Node `new Date()` and Postgres defaultNow() → standardized on `sql now()`. Commit at this checkpoint.
  - **Slice 3 (auth): NEXT — the HARD-PAUSE slice.** Auth.js v5 GitHub OAuth (authN) + isAdmin allowlist in middleware on all /admin + write routes (authZ), kept separate. STOP for review before Slice 4; verify boundary (unauth rejected on /admin + writes; logged-in non-allowlisted denied; only ADMIN_EMAILS passes). Use Opus 4.8.
- **Environment (resolved, logged in PROGRESS.md):** Node/npm/pnpm now on the persistent Windows PATH (agent runs PowerShell; user's Git Bash fixed via .bashrc). Playwright Chromium installed — add a `playwright install` postinstall guard so a clean clone can't regress. Node is v23 (non-LTS) — fine for now, consider LTS later, not mid-phase.
- **External accounts:** `.env.local` fully populated, matches `.env.example`. `.gitignore` correctly ignores `.env.local` (was briefly missing — fixed, confirmed untracked). **Vercel mirror COMPLETE** — all 10 Phase 2 vars present with prod values (DATABASE_URL must be the `main` branch string; TEST_DATABASE_URL correctly excluded). Vercel vars apply on next deploy; add prod GitHub OAuth callback URL at deploy time.

## Deferred backlog (not scheduled)
- Events retention/archival: move old rows to cold storage or roll up into aggregates on a schedule. Fine to defer — no traffic yet. Phase 2 kept the schema archival-friendly (indexed ts, no blocking FKs) so this stays a background job later, not a migration.

## Immediate next steps
1. **Slice 3 (auth)** — fresh Cursor chat, **Opus 4.8**, read PROGRESS.md first. Build Auth.js v5 + isAdmin middleware. STOP at the auth boundary for review before Slice 4.
2. Then Slice 4 (GitHub ingestion) and Slice 5 (events + dashboard), gating each.
3. First DB-backed **deploy** happens at end of a slice — ensure Vercel `DATABASE_URL` = `main` branch, add prod OAuth callback URL then.

## Assistant's standing instructions
Architect and direct; keep Cursor from losing the goal or drifting past scope; give exact step-by-step for every external tool without assuming prior knowledge; review each slice against its Definition of Done; hold the Slice 3 auth pause firmly; remember the reasoning behind every locked decision above.