import { test, expect } from "@playwright/test";

/**
 * The firelight cursor is a progressive enhancement: it must never mount under
 * `prefers-reduced-motion: reduce`, and its presence must not introduce console
 * errors on the landing page.
 */
test("the firelight cursor canvas is absent under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The only fixed, pointer-events-none canvas on the page is the cursor glow.
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("the landing page loads with no console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
