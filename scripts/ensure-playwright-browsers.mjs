// Playwright's browser binaries are downloaded separately from `pnpm
// install` and aren't tracked by the lockfile, so a clean clone (or a fresh
// per-session sandbox — see PROGRESS.md) silently has no Chromium until
// someone remembers to run `playwright install` by hand. This postinstall
// guard makes that automatic for local/dev machines, closing a gap that's
// caused a manual reinstall more than once.
//
// Skipped under CI (which Vercel's build machines also set): production
// deploys never run Playwright, so downloading ~180MB of browser binaries
// on every build would be pure waste. A future CI workflow that DOES run
// e2e should install browsers as its own explicit step (the standard
// Playwright CI pattern), not rely on this postinstall hook.
import { spawnSync } from "node:child_process";

if (process.env.CI) {
  process.exit(0);
}

// PLAYWRIGHT_BROWSERS_PATH=0 installs alongside the package inside
// node_modules instead of a machine-global cache dir, matching
// `pnpm test:e2e` (see scripts/run-e2e.mjs) so browsers persist for this
// project rather than vanishing with a per-session sandbox temp dir.
const result = spawnSync("pnpm", ["exec", "playwright", "install", "chromium"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: "0" },
});

if (result.status !== 0) {
  console.warn(
    "[postinstall] Playwright Chromium install failed — run " +
      "`pnpm exec playwright install chromium` manually before `pnpm test:e2e`.",
  );
}
// A browser-download hiccup (e.g. no network yet) must never fail the
// whole `pnpm install`; the warning above is the safety net.
process.exit(0);
