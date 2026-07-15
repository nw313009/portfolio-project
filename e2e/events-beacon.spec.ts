import { test, expect } from "@playwright/test";

/**
 * The public event beacon must be present and functional WITHOUT changing how
 * the timeline renders. A `view` event is fired (via `sendBeacon`, a POST to
 * `/api/events`) when a project node enters the viewport. This asserts the
 * request round-trips successfully (a 204 from the server — recorded, or a
 * silently-dropped bot) and that its presence introduces no console errors and
 * doesn't disturb the page.
 *
 * The response status is checked rather than the request body: `sendBeacon`
 * sends a Blob, whose body Playwright does not reliably expose.
 */
test("firing the view beacon does not disturb the timeline", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const beaconResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/events") &&
      response.request().method() === "POST",
    { timeout: 15_000 },
  );

  await page.goto("/");

  // Timeline still renders as before.
  await expect(
    page.getByRole("heading", { level: 1, name: "Projects Timeline" }),
  ).toBeVisible();

  // The view beacon was emitted and accepted (204 = recorded or silently
  // dropped as a bot — never a 4xx/5xx that would signal a broken beacon).
  const response = await beaconResponse;
  expect(response.status()).toBe(204);

  expect(consoleErrors).toEqual([]);
});
