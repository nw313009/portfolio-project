import { test, expect } from "@playwright/test";

test("skills page groups skills by category", async ({ page }) => {
  await page.goto("/skills");

  await expect(page.getByRole("heading", { level: 1, name: "Skills" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Frontend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Backend" })).toBeVisible();
});

test("a skill's evidence chip deep-links into the timeline", async ({ page }) => {
  await page.goto("/skills");

  const evidenceLink = page
    .locator('a[href="/projects#timeline-portfolio"]')
    .first();
  await evidenceLink.scrollIntoViewIfNeeded();
  await evidenceLink.click();

  await expect(page).toHaveURL(/\/projects#timeline-portfolio$/);
  await expect(page.locator("li#timeline-portfolio")).toBeInViewport({
    timeout: 10_000,
  });
});
