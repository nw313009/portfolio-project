import { test, expect } from "@playwright/test";

/**
 * Drives the REAL middleware optimistic gate with no session (no GitHub OAuth):
 * an unauthenticated visitor must be bounced away from /admin and denied on the
 * protected write route. The authZ pass/deny-by-principal matrix is covered by
 * the mocked unit/integration tests (authZ tests inject the principal rather
 * than driving real OAuth).
 */

test("unauthenticated visitor is redirected away from /admin", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});

test("unauthenticated write to /api/admin/ping is denied", async ({
  request,
}) => {
  const res = await request.post("/api/admin/ping", { maxRedirects: 0 });
  // Either the optimistic middleware redirect (302/307) or the authoritative
  // resource-layer denial (401) — never a successful 200.
  expect([302, 307, 401, 403]).toContain(res.status());
  expect(res.status()).not.toBe(200);
});

test("the public landing stays unauthenticated and untouched by middleware", async ({
  page,
}) => {
  // The public root must not be gated: no redirect to sign-in, page renders.
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
