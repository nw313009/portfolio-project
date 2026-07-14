import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 1 acceptance E2E: the Test Gate criteria from `docs/phases/PHASES.md`.
 * Exercises the same 4 sample projects originally authored as MDX in
 * `src/content/projects` (oldest "Pixel Dungeon" 2021 to newest "Timeline
 * Portfolio" 2024, spanning the `media`, `cli`, `library`, and `webapp`
 * preview types) — as of Phase 2 Slice 2, the public page reads these from
 * the `projects` table (seeded via `pnpm db:seed`) instead of MDX at request
 * time, so this file also proves the DB-backed read path preserves the
 * Phase 1 UI, ordering, and preview behavior exactly.
 */

const PROJECT_TITLES_OLDEST_FIRST = [
  "Pixel Dungeon",
  "devlog",
  "use-scroll-timeline",
  "Timeline Portfolio",
];

/** Scrolls the whole page down by `deltaY` and lets in-flight animations settle. */
async function scrollPageBy(page: Page, deltaY: number) {
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(300);
}

test.describe("Timeline acceptance", () => {
  test("renders every project's card, in oldest-first date order", async ({ page }) => {
    await page.goto("/");
    const headings = page.getByRole("heading", { level: 2 });
    await expect(headings).toHaveText(PROJECT_TITLES_OLDEST_FIRST);
  });

  test("scrolling advances the center line's draw progress", async ({ page }) => {
    await page.goto("/");
    const drawnLine = page.locator("svg path.stroke-primary");

    // Motion draws the line by writing `stroke-dasharray`/`pathLength`
    // attributes directly (not a `style` attribute) as `progress` changes.
    const beforeScroll = await drawnLine.getAttribute("stroke-dasharray");
    await scrollPageBy(page, 2000);
    const afterScroll = await drawnLine.getAttribute("stroke-dasharray");

    expect(afterScroll).not.toBe(beforeScroll);
  });

  test("scrolling reveals a below-the-fold card", async ({ page }) => {
    await page.goto("/");
    // The newest project ("Timeline Portfolio") is last, well below the fold.
    const lastCardHeading = page.getByRole("heading", {
      level: 2,
      name: "Timeline Portfolio",
    });

    await expect(lastCardHeading).toBeAttached();
    await expect(lastCardHeading).not.toBeInViewport();

    await lastCardHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600); // let the whileInView fade/slide-in transition finish

    await expect(lastCardHeading).toBeVisible();
    const opacity = await lastCardHeading
      .locator("xpath=ancestor::article[1]")
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeCloseTo(1, 1);
  });

  test("hovering the webapp card's preview mounts a sandboxed iframe", async ({ page }) => {
    await page.goto("/");
    const previewButton = page.getByRole("button", {
      name: /preview timeline portfolio/i,
    });
    await previewButton.scrollIntoViewIfNeeded();
    await previewButton.hover();

    const iframe = page.frameLocator("iframe[title='Timeline Portfolio demo']");
    await expect(page.locator("iframe[title='Timeline Portfolio demo']")).toHaveAttribute(
      "sandbox",
      /allow-scripts/,
    );
    // Smoke-check the frame actually loaded content, not just that the tag exists.
    await expect(iframe.locator("body")).toBeVisible();
  });

  test("a non-webapp card renders its own media, never an iframe", async ({ page }) => {
    await page.goto("/");
    const pixelDungeonCard = page
      .getByRole("heading", { level: 2, name: "Pixel Dungeon" })
      .locator("xpath=ancestor::article[1]");

    await expect(pixelDungeonCard.getByRole("list", { name: /screenshots/i })).toBeVisible();
    await expect(pixelDungeonCard.locator("iframe")).toHaveCount(0);
  });

  test("mobile viewport collapses to a single left-aligned rail", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Reduced motion renders every card at its final resting position
    // immediately, so this measures layout placement, not in-flight
    // whileInView slide-in offsets.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const cardArticles = page.locator("ol > li article");
    const count = await cardArticles.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const boxes = await cardArticles.evaluateAll((elements) =>
      elements.map((el) => el.getBoundingClientRect().x),
    );
    const [firstX, ...restX] = boxes;
    for (const x of restX) {
      expect(x).toBeCloseTo(firstX, 0);
    }
  });

  test("loads, scrolls, and previews a webapp with zero console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto("/");
    await scrollPageBy(page, 1500);

    const previewButton = page.getByRole("button", {
      name: /preview timeline portfolio/i,
    });
    await previewButton.scrollIntoViewIfNeeded();
    await previewButton.hover();
    await page.waitForTimeout(600);

    expect(consoleErrors).toEqual([]);
  });
});
