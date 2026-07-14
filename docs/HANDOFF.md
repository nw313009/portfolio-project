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
  - **Slice 1 (data layer): COMPLETE + committed to git.** Neon + Drizzle; tables projects/events/audit_log; events.ts and events.(projectId,ts) indexed; events has NO FK to projects (archival-friendly). Driver split wired (neon-http reads / neon-serverless Pool transactional writes). Integration tests run for real against the Neon **test** branch. NOTE/gotcha caught: drizzle-kit's own dotenv reload silently redirected the test-branch migration back to dev while reporting success — verify against information_schema directly, and ensure the fix is durable/committed so it can't regress.
  - **Slice 2 (read path on DB): STARTING NOW** — migrate MDX projects into the DB, render timeline from Drizzle via neon-http + ISR, public read path stays cached with no auth. Must PROVE the timeline reads from the DB, not MDX.
- **External accounts:** `.env.local` fully populated and matches `.env.example` (Neon x3, AUTH_SECRET, GitHub OAuth pair, ADMIN_EMAILS, GITHUB_TOKEN, Blob token, Upstash pair). `.gitignore` now correctly ignores `.env.local` (was briefly missing — fixed; confirmed not tracked). Vercel env-var mirroring is IN PROGRESS (being completed while Slice 2 runs). Blob connect hit an "already connected" conflict — treated as benign; token exists.

## Deferred backlog (not scheduled)
- Events retention/archival: move old rows to cold storage or roll up into aggregates on a schedule. Fine to defer — no traffic yet. Phase 2 kept the schema archival-friendly (indexed ts, no blocking FKs) so this stays a background job later, not a migration.

## Immediate next steps
1. Run Slice 2 (fresh Cursor chat, Sonnet 5, read PROGRESS.md first) — prompt is in this session / matches the Slice 2 pattern in PHASES.md.
2. Finish mirroring env vars into Vercel (prod values; DATABASE_URL must be the `main` branch string, not dev). Only needed before the next DEPLOY, not before each slice.
3. **Slice 3 (auth) is the hard-pause slice** — verify the authN≠authZ boundary (unauth rejected on /admin + write routes; logged-in non-allowlisted denied; only ADMIN_EMAILS passes) BEFORE any write path is built on top.
4. Continue Slices 4 (GitHub ingestion) and 5 (events + dashboard), gating each.
5. At deploy time: add the prod GitHub OAuth callback URL (https://<domain>/api/auth/callback/github) to the existing OAuth app.

## Assistant's standing instructions
Architect and direct; keep Cursor from losing the goal or drifting past scope; give exact step-by-step for every external tool without assuming prior knowledge; review each slice against its Definition of Done; hold the Slice 3 auth pause firmly; remember the reasoning behind every locked decision above.