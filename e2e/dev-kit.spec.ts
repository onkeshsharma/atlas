// M4 — /dev-kit smoke + goldens (charter done-criteria 2 + 3): every §5
// section renders, full-page golden at 1440, and side-by-side fidelity
// captures for the 5 representative primitives vs their source-variant
// regions. Evidence PNGs land outside the repo in ../notes/m4-captures/.
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m4-captures");

/** the 28 §5 inventory sections, in canon order. */
const KIT_SECTIONS = [
  "sidebar",
  "page-header",
  "divided-list",
  "featured-card",
  "mono-section-label",
  "state-dot",
  "live-pulse",
  "state-machine-track",
  "pill-button",
  "tooltip",
  "modal-shell",
  "command-palette",
  "underline-input",
  "segmented-control",
  "scope-chip",
  "option-card",
  "kbd",
  "pull-quote",
  "numbered-steps",
  "empty-state",
  "initial-mark",
  "sparkline",
  "terminal-block",
  "kanban-card",
  "timeline-rail",
  "amber-panel",
  "recent-chip",
  "email-shell",
];

test("dev-kit renders all 28 inventory sections", async ({ page }) => {
  test.setTimeout(240_000); // first compile of the gallery on a dev server
  await page.goto("/dev-kit");
  await expect(page.getByRole("heading", { name: /^Kit\./ })).toBeVisible();
  for (const id of KIT_SECTIONS) {
    await expect(
      page.locator(`[data-kit-section="${id}"]`),
      `section ${id}`,
    ).toHaveCount(1);
  }
  await expect(page.locator("[data-kit-section]")).toHaveCount(KIT_SECTIONS.length);
});

test("dev-kit golden capture at 1440", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/dev-kit");
  await page.waitForLoadState("networkidle");
  // animate-ping never settles — freeze animations for a stable golden.
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; }" });
  await page.screenshot({
    path: join(CAPTURE_DIR, "dev-kit-1440.png"),
    fullPage: true,
  });
});

// ── Done-criterion 3: 5-primitive side-by-side fidelity proof ──────────
// kit section render vs the cited source-variant region. Differences are
// canon overrules only — each named (with §) in notes/M4-manual-test.md.

async function freeze(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; }" });
}

async function captureKitSection(page: Page, id: string, file: string) {
  await page.goto("/dev-kit");
  await freeze(page);
  await page
    .locator(`[data-kit-section="${id}"]`)
    .screenshot({ path: join(CAPTURE_DIR, file) });
}

test("fidelity — PillButton (kit all-6-kinds vs O ship card + JJ confirm + L CTAs)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await captureKitSection(page, "pill-button", "fidelity-pillbutton-kit.png");

  await page.goto("/dev-variants/o");
  await freeze(page);
  // "Ship 2 now" is unique to the rail ship card (plain-string getByText is
  // case-insensitive and would also match "2 are ready to ship." up-page).
  await page
    .locator("section", { hasText: /Ship 2 now/ })
    .first()
    .screenshot({ path: join(CAPTURE_DIR, "fidelity-pillbutton-variant-o-ship.png") });

  await page.goto("/dev-variants/jj");
  await freeze(page);
  await page
    .locator("div.max-w-lg")
    .first()
    .screenshot({ path: join(CAPTURE_DIR, "fidelity-pillbutton-variant-jj-confirm.png") });

  await page.goto("/dev-variants/l");
  await freeze(page);
  await page
    .locator("main div.max-w-md")
    .first()
    .screenshot({ path: join(CAPTURE_DIR, "fidelity-pillbutton-variant-l-ctas.png") });
});

test("fidelity — Sidebar (kit vs variant E rail)", async ({ page }) => {
  test.setTimeout(240_000);
  await captureKitSection(page, "sidebar", "fidelity-sidebar-kit.png");
  await page.goto("/dev-variants/e");
  await freeze(page);
  await page
    .locator("aside")
    .first()
    .screenshot({ path: join(CAPTURE_DIR, "fidelity-sidebar-variant-e.png") });
});

test("fidelity — DividedList (kit vs variant E Recent feed)", async ({ page }) => {
  test.setTimeout(240_000);
  await captureKitSection(page, "divided-list", "fidelity-dividedlist-kit.png");
  await page.goto("/dev-variants/e");
  await freeze(page);
  await page
    .locator("section", {
      has: page.getByRole("heading", { name: "Recent", exact: true }),
    })
    .first()
    .screenshot({ path: join(CAPTURE_DIR, "fidelity-dividedlist-variant-e.png") });
});

test("fidelity — AmberPanel (kit incl. multi-Run form vs variant XX show-once panel)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await captureKitSection(page, "amber-panel", "fidelity-amberpanel-kit.png");
  await page.goto("/dev-variants/xx");
  await freeze(page);
  await page
    .locator("div.border-amber-300")
    .first()
    .screenshot({ path: join(CAPTURE_DIR, "fidelity-amberpanel-variant-xx.png") });
});

test("fidelity — UnderlineInput (kit all validation states vs variant L form)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await captureKitSection(page, "underline-input", "fidelity-underlineinput-kit.png");
  await page.goto("/dev-variants/l");
  await freeze(page);
  await page
    .locator("main div.max-w-md")
    .first()
    .screenshot({ path: join(CAPTURE_DIR, "fidelity-underlineinput-variant-l.png") });
});

test("dev-kit 404s without the dev flag is covered by prod build (see M3); unknown route still 404s", async ({
  page,
}) => {
  const response = await page.goto("/dev-kit/nope");
  expect(response?.status()).toBe(404);
});
