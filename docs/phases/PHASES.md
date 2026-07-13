# Phase Specs

Each phase has a Goal, In-Scope, **Out-of-Scope** (hard guard against drift), Definition of Done, a Test Gate the agent must pass before stopping, and a Kickoff prompt. Do one phase, pass its gate, update `docs/PROGRESS.md`, then stop for review.

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

## Phase 2 — Dynamic content + metrics
**Goal:** Add projects without redeploying, and track visitor interactions.
**Suggested model:** Sonnet 5 default; Opus 4.8 for the authN/authZ middleware and the GitHub-ingestion error handling.

**In-scope:** Neon Postgres + Drizzle (tables: `projects`, append-only `events`, `audit_log`). Migrate MDX → DB; render timeline from DB with ISR. Auth.js (NextAuth v5) admin login (GitHub OAuth); authZ via `isAdmin` allowlist in middleware on all `/admin` and write routes. Admin page + `POST /api/projects` that ingests a GitHub URL (validate host, GitHub REST API for metadata/README) and, best-effort, captures a demo screenshot via Playwright. `POST /api/events` (rate-limited, no auth) + a `useTrack()` hook firing view/hover/demo-open/outbound-click via `sendBeacon`. Protected `/admin` dashboard aggregating events per project.

**Out-of-scope:** Python/FastAPI, AI features, AWS, live sandboxed builds, anything touching auth on the public hot path.

**Locked infra decisions:**
- **DB/testing:** Neon branching — a disposable/reset `test` branch for migrations + unit tests, a seeded `dev` branch for E2E, `main` = prod. Never test against prod. `DATABASE_URL` per env; migrations forward-only, committed.
- **Media storage:** Vercel Blob (not AWS). Persist the blob URL on the project; wrap the upload in a single `storagePut()` helper so Phase 3 can swap to S3 without touching callers.
- **Rate limiting:** `@upstash/ratelimit` on Upstash Redis, sliding window keyed on client IP; return 429 over the limit; never let a 429 affect the visitor UI; do NOT use Postgres for rate-limiting.
- All three (Neon, Vercel Blob, Upstash) are serverless, scale-to-zero, free-tier, no-AWS.

**Confirmed patterns (Context7-verified — use these, don't re-derive):**
- Drizzle: `drizzle-orm/neon-http` + `@neondatabase/serverless` for fast edge/ISR reads; `drizzle-orm/neon-serverless` (WS `Pool`) when a write needs a transaction. Migrations via `drizzle-kit generate` / `migrate`.
- Auth.js v5: split `auth.config.ts` (edge-safe, providers only) + `auth.ts`; JWT sessions (no DB adapter — single-admin allowlist); `[...nextauth]` route handler; `middleware.ts` wrapping `auth()`.

**Definition of Done:** Public timeline reads from DB and stays cached/fast; admin login works and gates writes; adding a GitHub URL creates a project (draft on capture failure, never a 500); events land in the DB; dashboard shows per-project view/hover/CTR; audit_log records admin writes; Test Gate green.

**Test Gate:** unauthed user cannot reach `/admin` or POST projects; authed admin can add a project end-to-end; a public hover fires exactly one event and never blocks UI; bad GitHub URL yields a draft + audit entry, not a crash.

---

## Phase 3 — Python/FastAPI backend + AI (on AWS)
**Goal:** A real backend service that adds AI over the interaction data.
**Suggested model:** Opus 4.8 for the service architecture, Next.js↔FastAPI contract, and IAM/deploy design; Sonnet 5 for routine implementation.

**In-scope:** FastAPI service with a provider abstraction over Anthropic/OpenAI. Insights job over `events` writing to an `insights` table Next.js reads. "Chat with my portfolio" via RAG on project data. Deploy the service to AWS (ECS/Fargate), media to S3, DB to RDS (or keep Neon and connect), secrets in a secret store, GitHub Actions CI/CD. Least-privilege IAM.

**Out-of-scope:** Kubernetes; multi-region; anything that puts auth or the AI call on the public read hot path; agent autonomy over money/permissions without a human checkpoint.

**Definition of Done:** FastAPI deployed and reachable from Next.js over a typed contract; insights render; chat answers from real project data; IAM is least-privilege; traces/logs/metrics visible; Test Gate green (incl. contract tests between Next.js and FastAPI).

**Test Gate:** service healthcheck passes in AWS; Next.js → FastAPI contract test green; insights job is idempotent; chat returns grounded answers on a golden question set; unauthorized callers rejected.

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
**In-scope:** caching/CDN tuning, event pipeline scaling (queue/batch), read replicas if needed, Terraform for repeatable infra, cost review.
**Out-of-scope:** anything not justified by a measured need.
**Definition of Done + Gate:** infra reproducible from code; documented capacity limits; cost within budget; interview-ready write-up of the scaling decisions.