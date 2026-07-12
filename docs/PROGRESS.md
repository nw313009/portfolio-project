# Build Progress

> The agent reads this first every session to find the CURRENT phase, and updates it after each slice. One phase at a time. Full phase specs live in `docs/phases/PHASES.md`; architecture rationale in `docs/ARCHITECTURE.md`.

**CURRENT PHASE: 1 — Timeline frontend**

## Phase status
- [ ] **Phase 1 — Timeline frontend** (Next.js scaffold, timeline UI, iframe/media previews, deploy to Vercel)
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
- [ ] Deployed to Vercel

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

## Changelog
- 2026-07-11 — Slices 1–5 (scaffold, content schema, static timeline, scroll motion, preview components) implemented and verified across earlier sessions; see chat history for per-slice detail. Test Gate green at each step.
- 2026-07-11 — Slice 6: dark mode (`next-themes` + `ThemeToggle`), responsive single-rail mobile layout, and client-side pagination (`PAGE_SIZE = 6` behind an `IntersectionObserver` sentinel) added to `Timeline`. New unit tests for `ThemeToggle` and pagination behavior. Test Gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test && pnpm test:e2e` — all green (56 unit tests, 1 E2E test).
- 2026-07-11 — Slice 7: added `e2e/timeline.spec.ts` covering the Phase 1 acceptance criteria (date-ordered cards, scroll-driven line draw, scroll-revealed card, hover-mounted sandboxed webapp iframe, non-webapp card never renders an iframe, mobile single-rail geometry, zero console errors). Production build verified Vercel-ready. Test Gate: all green (56 unit tests, 8 E2E tests). Phase 1 complete pending Vercel deploy (manual, deployment steps provided to the user).
