# Phase Specs

Each phase has a Goal, In-Scope, **Out-of-Scope** (hard guard against drift), Definition of Done, a Test Gate the agent must pass before stopping, and a Kickoff prompt. Do one phase, pass its gate, update `docs/PROGRESS.md`, then stop for review.

**Convention shift at Phase 3:** Phases 1–2 are fully specified inline (~15 lines each). From Phase 3 on, a section here is an **INDEX** — goal, scope guards, and a pointer — while the full spec lives in a dedicated `docs/phases/PHASE-N.md`. Read the pointed-to file before any work on that phase; the inline section alone is not the spec.

**Shared Test Gate commands** (run all, all must pass):
`pnpm typecheck` · `pnpm lint` · `pnpm build` · `pnpm test` (where tests exist) · then Playwright MCP: start the dev server and verify that phase's acceptance criteria in a real browser.

**Model note (Cursor Ultra — cost isn't a constraint):** pin **Sonnet 5** as the working default, escalate to **Opus 4.8** for reasoning-heavy/architectural slices. If newer Sonnet/Opus tiers ship, the logic holds: mid-tier for implementation, top-tier for architecture.

---

## Phase 1 — Timeline frontend
**Goal:** A live, polished, static portfolio that reads as a vertical center-line timeline.
**Suggested model:** Sonnet 5 for the slices; switch to Opus 4.8 for the `Project` union/schema design (Slice 2).

**In-scope:** Next.js 15 (App Router) + TS strict + Tailwind + shadcn/ui + framer-motion. Typed `Project` zod schema with a discriminated `preview` union (`webapp|cli|service|library|notebook|media`). Projects as MDX content. Center SVG line that draws on scroll; cards alternate left/right, enter on scroll, oldest at top; paginated/lazy. Hover preview: iframe for `webapp` demos, recorded media/snippet for other types. Responsive (mobile single rail), dark mode, reduced-motion. Deploy to Vercel.

**Out-of-scope (do NOT build yet):** database, auth, admin UI, GitHub ingestion, metrics/events, any API route beyond static content, Python, AWS.

**Definition of Done:** Timeline renders from typed content; scroll animations smooth; each previewType renders its correct component; `webapp` iframe lazy-loads on hover with a loading + fallback state; fully responsive; Test Gate green; deployed URL live.

**Test Gate (Playwright):** timeline renders N cards in date order; scrolling advances the line and reveals cards; hovering a `webapp` card mounts the iframe; a non-web card shows its media/snippet (not an iframe); mobile viewport collapses to one rail; no console errors.

**Kickoff:** "Read docs/PROGRESS.md and the Phase 1 spec in docs/phases/PHASES.md. Implement Phase 1 only, smallest coherent slice first. Use Context7 for Next.js/React APIs. When done, run the Test Gate, update PROGRESS.md, and stop for my review."

---

## Phase 2 — Dynamic content + metrics — ✅ COMPLETE (DEPLOYED)
**Goal:** Add projects without redeploying, and track visitor interactions.
**Suggested model:** Sonnet 5 default; Opus 4.8 for the authN/authZ middleware and the GitHub-ingestion error handling.

**In-scope:** Neon Postgres + Drizzle (tables: `projects`, append-only `events`, `audit_log`). Migrate MDX → DB; render timeline from DB with ISR. Auth.js (NextAuth v5) admin login (GitHub OAuth); authZ via `isAdmin` allowlist (middleware = optimistic UX gate; the authoritative check is at the resource). Admin page + a GitHub-URL ingestion action (validate host, GitHub REST API for metadata) creating a draft. `POST /api/events` (rate-limited, no auth) + a `track()` hook firing view/hover/demo-open via `sendBeacon`. Protected `/admin` dashboard aggregating events per project.

**Out-of-scope:** Python/FastAPI, AI features, AWS, live sandboxed builds, anything touching auth on the public hot path.

**Locked infra decisions:**
- **DB/testing:** Neon branching — a disposable/reset `test` branch for migrations + unit tests, a seeded `dev` branch for E2E, `main` = prod. Never test against prod. `DATABASE_URL` per env (prod named `DATABASE_URL_MAIN[_UNPOOLED]`, consumed by the `:main` script wrappers — never hand-pasted); migrations forward-only, committed.
- ~~**Media storage:** Vercel Blob~~ **KILLED (2026-07-17):** Blob removed from Phase 2 — no consumer (MDX preview assets are committed to `/public`; screenshot-on-ingest was killed). `media_url` column is vestigial (drop is a deliberate later step). Blob re-enters only if admin rich-preview *upload* authoring becomes a slice (Phase 3+).
- **Rate limiting:** `@upstash/ratelimit` on Upstash Redis, sliding window keyed on client IP; return 429 over the limit; never let a 429 affect the visitor UI; do NOT use Postgres for rate-limiting. (Events beacon fails OPEN; the contact form fails CLOSED — the abuse target there is the inbox.)
- Neon + Upstash are serverless, scale-to-zero, free-tier, no-AWS.

**Confirmed patterns (Context7-verified — use these, don't re-derive):**
- Drizzle: `drizzle-orm/neon-http` + `@neondatabase/serverless` for fast edge/ISR reads; `drizzle-orm/neon-serverless` (WS `Pool`) when a write needs a transaction. Migrations via `drizzle-kit generate` / `migrate`.
- Auth.js v5: split `auth.config.ts` (edge-safe, providers only) + `auth.ts`; JWT sessions (no DB adapter — single-admin allowlist); `[...nextauth]` route handler; `middleware.ts` wrapping `auth()`.

**Locked patterns (as-built — do NOT re-derive or contradict):**
- **authZ at the RESOURCE, not the middleware.** Middleware is an optimistic UX gate only (CVE-2025-29927 makes it bypassable); every privileged server op re-runs `requireAdmin()` server-side against the LIVE allowlist. Middleware is never the security boundary.
- **`events.type = 'hover'` MEANS "preview button clicked"**, not hover-intent (reused the Slice 1 enum value under a no-migration constraint; dashboard relabels it "Preview opened"). Rename to `preview_open` only on the next `events` enum migration that happens for another reason.
- **MDX is the PERMANENT rich-preview authoring path.** The read-path mapper normalizes two storage shapes into one union: rich `preview` jsonb (MDX) OR flat `preview_type`+`demo_url` (ingested → synthesizes only `webapp`). A `projects_single_preview_shape` CHECK enforces exactly one shape per row. Preview surfaces are NOT authorable via admin ingestion; screenshot/thumbnail-on-ingest is killed.

**Definition of Done:** Public timeline reads from DB and stays cached/fast; admin login works and gates writes; adding a GitHub URL creates a project (draft on capture failure, never a 500); events land in the DB; dashboard shows per-project view/hover/CTR; audit_log records admin writes; Test Gate green.

**Test Gate:** unauthed user cannot reach `/admin` or POST projects; authed admin can add a project end-to-end; a public hover fires exactly one event and never blocks UI; bad GitHub URL yields a draft + audit entry, not a crash.

---

## Phase 3 — AI Guide (RAG + agent) on AWS
**⚠️ FULL SPEC: `docs/phases/PHASE-3.md`. Read it before any Phase 3 work — this section is the index only.**
**Goal:** An opt-in, grounded AI guide over Writam's own corpus (projects, skills, about-me) that cites its sources and suggests what to see next.
**Suggested model:** Opus 4.8 for every slice (see PHASE-3.md slice table).

**In-scope (summary):** FastAPI + LangGraph on a Lambda container (arm64) behind a Function URL with **Lambda Web Adapter** response streaming; Terraform (manual apply); pgvector on Neon; **Mistral Small (pinned model string)** + Mistral embeddings; Langfuse tracing; Upstash rate limiting + global daily spend ceiling (fails closed); chat interactions into the existing `events` table; eval harness + LLM-as-judge.

**Out-of-scope (hard guards):** Kubernetes; ECS/Fargate; S3/Blob; RDS; a dedicated vector DB; self-hosted weights; an `insights` table or ANY AI-over-visitor-data job; LangGraph checkpointers / server-side conversation state; a live re-embedding pipeline; provisioned concurrency; reading `events` from the agent; Mangum (**it buffers — will not stream**).

**Superseded (do NOT build — earlier drafts of this file said otherwise):** Anthropic/OpenAI provider abstraction → **Mistral**. ECS/Fargate → **Lambda**. S3 media → **none**. RDS → **Neon**. GitHub Actions CI/CD → **Terraform, manual**. Insights job/table → **killed** (the AI is grounded on Writam's static corpus, not visitor data; `events` stays write-only).

**Definition of Done + Test Gate:** per-slice, in `PHASE-3.md` §10.

---

## Phase 4 — Production hardening
**Goal:** Make it dependable and observable.
**Suggested model:** Opus 4.8 for observability/failure-mode design; Sonnet 5 for wiring it up.
**In-scope:** OpenTelemetry traces/metrics/logs; structured logging; rate-limit + abuse protection on public endpoints; complete audit trail on admin actions; error boundaries + graceful degradation; backup/restore for DB; CI gates (typecheck/lint/test/build) required to merge.
**Out-of-scope:** premature scaling infra; features.
**Definition of Done + Gate:** synthetic load doesn't break the UI; an induced failure in previews/ingestion/AI degrades gracefully; alerts fire on error-rate spikes; CI blocks a red build.

---

## Phase 5 — Scale / enterprise polish
**Goal:** Only if traffic/portfolio goals demand it.
**Suggested model:** Opus 4.8 for scaling/cost/infra decisions; Sonnet 5 for Terraform and routine changes.
**In-scope:** caching/CDN tuning, event pipeline scaling (queue/batch), read replicas if needed, cost review, and *extending* the Terraform baseline. (Note: Terraform itself is **pulled forward into Phase 3** — it's the IaC tool from the AI service's first deploy, not a Phase 5 introduction.)
**Out-of-scope:** anything not justified by a measured need.
**Definition of Done + Gate:** infra reproducible from code; documented capacity limits; cost within budget; interview-ready write-up of the scaling decisions.