# Projects Timeline

A scroll-driven, center-line portfolio timeline. Next.js 15 (App Router) + TypeScript, styled with Tailwind CSS and shadcn/ui, animated with `motion`. Project content is authored as MDX and validated against a typed Zod schema at build time via Velite.

This is Phase 1 of the project (see `docs/PROGRESS.md` and `docs/phases/PHASES.md`): a static, no-backend portfolio. Later phases add a database, admin auth, and a Python/FastAPI service.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Adding a project

Add an MDX file under `src/content/projects/`. Frontmatter is validated against the `Project` schema in `src/lib/project-schema.ts` — an invalid `previewType` payload or a missing required field fails the build (see Velite's `strict` mode in `velite.config.ts`). Each project's `preview` must be exactly one of: `webapp`, `cli`, `service`, `library`, `notebook`, or `media`.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the dev server (also runs Velite in watch mode). |
| `pnpm build` | Production build (runs Velite first). |
| `pnpm start` | Serve a production build. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm lint` | ESLint. |
| `pnpm test` | Unit/component tests (Vitest + Testing Library). |
| `pnpm test:e2e` | End-to-end tests (Playwright). |

The full Test Gate is: `pnpm typecheck && pnpm lint && pnpm build && pnpm test && pnpm test:e2e`.

## Deploying to Vercel

This app is static (no database, no server-only secrets) and deploys as-is.

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Next.js. Confirm these settings (should be the defaults):
   - **Framework Preset:** Next.js
   - **Build Command:** `pnpm build` (this also runs `pnpm prebuild` → `velite --clean` beforehand)
   - **Install Command:** `pnpm install`
   - **Output:** managed automatically by the Next.js framework preset
4. No environment variables are required for Phase 1.
5. Click **Deploy**. Every subsequent push to the production branch redeploys automatically; pull requests get preview deployments.

### Deploying via the Vercel CLI instead

```bash
pnpm dlx vercel        # first deploy: link the project, deploy a preview
pnpm dlx vercel --prod # promote to production
```

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Velite Documentation](https://velite.js.org)
- [Motion Documentation](https://motion.dev)
