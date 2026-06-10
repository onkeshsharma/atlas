// M3 — dev-variants smoke: the index lists all vendored prototypes, every
// key renders, and E/F/G get 1440 spot captures (charter done-criteria 1).
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

// Keys derived from the vendored filenames so the spec can never drift
// from what is actually on disk: variant-<key>-<slug>.tsx → <key>.
const VARIANT_KEYS = readdirSync(join(__dirname, "..", "design", "variants"))
  .filter((f) => f.startsWith("variant-") && f.endsWith(".tsx"))
  .map((f) => f.split("-")[1])
  .sort();

test("index lists every vendored variant", async ({ page }) => {
  await page.goto("/dev-variants");
  await expect(
    page.getByRole("heading", { name: /^Variants\./ }),
  ).toBeVisible();
  const links = page.locator('a[href^="/dev-variants/"]');
  await expect(links).toHaveCount(VARIANT_KEYS.length);
});

test("every variant key renders", async ({ page }) => {
  test.setTimeout(420_000); // 52 first-compiles on a dev server
  for (const key of VARIANT_KEYS) {
    const response = await page.goto(`/dev-variants/${key}`);
    expect(response?.status(), `/dev-variants/${key}`).toBe(200);
    // Each prototype renders real chrome — assert non-trivial DOM.
    const text = await page.locator("body").innerText();
    expect(text.length, `/dev-variants/${key} body text`).toBeGreaterThan(50);
  }
});

test("unknown key 404s", async ({ page }) => {
  const response = await page.goto("/dev-variants/nope");
  expect(response?.status()).toBe(404);
});

// Spot captures for M3 evidence (charter done-criterion 1) — written
// outside the repo, alongside the M-doc evidence in Desktop/Atlas/notes/.
const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m3-captures");

for (const key of ["e", "f", "g"]) {
  test(`spot capture — variant ${key.toUpperCase()} at 1440`, async ({
    page,
  }) => {
    await page.goto(`/dev-variants/${key}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: join(CAPTURE_DIR, `variant-${key}-1440.png`),
      fullPage: true,
    });
  });
}
