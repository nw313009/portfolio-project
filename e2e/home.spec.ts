import { test, expect } from "@playwright/test";

test("landing page loads with a hero and primary nav", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Projects" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Skills" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Get in touch" })).toBeVisible();
});

test("nav links route between landing, projects, and skills", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });

  await nav.getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

  await nav.getByRole("link", { name: "Skills" }).click();
  await expect(page).toHaveURL(/\/skills$/);
});

test("'Get in touch' deep-links to the contact card via the #contact hash", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });

  await nav.getByRole("link", { name: "Get in touch" }).click();

  await expect(page).toHaveURL(/\/projects#contact$/);
  const contact = page.locator("#contact");
  await expect(contact).toBeVisible();
  // Reuses the same hash-anchor scroll idiom as `/projects#<slug>` citations:
  // the visitor card at the END of the timeline is scrolled into view.
  await expect(contact).toBeInViewport();
});
