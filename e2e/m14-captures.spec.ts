// M14 — three-viewport fidelity captures of the six public surfaces
// (master plan §5 / M5's captureAcrossViewports pattern) into
// ../notes/m14-captures/. Public pages need no auth and no fixtures.
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m14-captures");

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

const SURFACES: Array<{ slug: string; url: string; heading: RegExp }> = [
  { slug: "landing", url: "/", heading: /A quiet place/ },
  { slug: "docs-index", url: "/docs", heading: /Atlas, explained\./ },
  { slug: "doc-article", url: "/docs/welcome-to-atlas", heading: /Welcome to Atlas\./ },
  { slug: "architecture", url: "/docs/architecture", heading: /How Atlas actually works\./ },
  { slug: "status", url: "/status", heading: /Atlas is/ },
  { slug: "changelog", url: "/changelog", heading: /What we shipped\./ },
];

async function captureAcrossViewports(page: Page, slug: string) {
  // animate-ping never settles — freeze animations (M4 pattern).
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; }",
  });
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({
      path: join(CAPTURE_DIR, `${slug}-${w}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

test.describe("m14 public surfaces — three-viewport captures", () => {
  for (const surface of SURFACES) {
    test(`${surface.slug} at 1920/1440/1280`, async ({ page }) => {
      await page.goto(surface.url);
      await expect(page.getByRole("heading", { name: surface.heading }).first()).toBeVisible();
      await captureAcrossViewports(page, surface.slug);
    });
  }
});
