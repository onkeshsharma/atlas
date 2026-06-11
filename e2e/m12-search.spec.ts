// M12 — NAV & SEARCH, Playwright-asserted (charter done criterion 1 +
// the no-daemon half of criterion 2): the ⌘K palette finds and
// navigates to a Ticket, a Run, a Project, a doc, and an action over
// the SEEDED universe; /search answers ?q= with grouped, filterable,
// honest results; the Today/inbox rows finally link. Self-cleaning:
// owner bootstrap per the suite law (E2E marker, deleted in afterAll);
// no DB writes beyond that — search is read-only.
import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { inArray, like } from "drizzle-orm";

// .env.local is loaded by playwright.config.ts before specs import.
import { db } from "../src/db/client";
import { memberships, userPreferences } from "../src/db/schema";

const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m12-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";

async function cleanupE2ERows() {
  const e2eMembers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M12 %"));
  if (e2eMembers.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, e2eMembers.map((m) => m.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M12 %"));
}

async function signIn(page: Page) {
  await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
}

function palette(page: Page) {
  return page.getByTestId("command-palette");
}

async function openPalette(page: Page) {
  // a ⌘K pressed before hydration is a silent no-op (the listener isn't
  // mounted yet) — retry the gesture, same discipline as sign-in.ts.
  for (let attempt = 0; ; attempt++) {
    await page.keyboard.press("Control+k");
    try {
      await expect(page.getByLabel("Command palette")).toBeVisible({ timeout: 3_000 });
      return;
    } catch (err) {
      if (attempt >= 3) throw err;
    }
  }
}

test.beforeAll(async () => {
  await cleanupE2ERows();
});

test.afterAll(async () => {
  await cleanupE2ERows();
});

test.describe.serial("M12 — everything two keystrokes away", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M12 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("⌘K: default sections, keyboard-first ticket jump, recents recall, esc", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);

    // open — UU's default sections over real rows
    await openPalette(page);
    // group headers (first() — "Projects" is also a Pages row label)
    await expect(palette(page).getByText("Projects", { exact: true }).first()).toBeVisible();
    await expect(palette(page).getByText("Actions", { exact: true }).first()).toBeVisible();
    await expect(palette(page).getByText("Pages", { exact: true }).first()).toBeVisible();
    await expect(palette(page).getByText("Recent Tickets", { exact: true })).toBeVisible();

    // esc closes (§2.11 shell law)
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Command palette")).toBeHidden();

    // exact ref → the ticket ranks first → ⏎ opens it (rank law, live)
    await openPalette(page);
    await page.getByLabel("Command palette").fill("T-247");
    await expect(
      page.locator("[data-palette-active]").getByText("Add export to CSV"),
    ).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/tickets\/T-247/, { timeout: 30_000 });

    // the selection is now a recent chip — clicking it recalls the route
    await page.goto("/today");
    await openPalette(page);
    await expect(palette(page).getByText("recent", { exact: true })).toBeVisible();
    await palette(page)
      .getByRole("button", { name: "Add export to CSV", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/tickets\/T-247/, { timeout: 30_000 });
  });

  test("⌘K: ↑↓ moves the active row; a Run, a Project, a doc, an action all navigate", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await signIn(page);

    // ArrowDown moves the §2.12 active row
    await openPalette(page);
    await page.getByLabel("Command palette").fill("export");
    await expect(page.locator("[data-palette-active]")).toBeVisible({ timeout: 15_000 });
    const before = await page.locator("[data-palette-active]").innerText();
    await page.keyboard.press("ArrowDown");
    const after = await page.locator("[data-palette-active]").innerText();
    expect(after).not.toBe(before);
    await page.keyboard.press("Escape");

    // Run by exact ref, keyboard-first
    await openPalette(page);
    await page.getByLabel("Command palette").fill("R-12");
    await expect(page.locator("[data-palette-active]").getByText("R-12 ·")).toBeVisible({
      timeout: 15_000,
    });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/runs\/R-12/, { timeout: 30_000 });

    // Project — wait for the ROW (the debounced results land after the
    // see-all affordance, which also matches the query text)
    await openPalette(page);
    await page.getByLabel("Command palette").fill("side-experiment");
    const projectRow = palette(page).getByRole("button", { name: /^▦ side-experiment/ });
    await expect(projectRow).toBeVisible({ timeout: 15_000 });
    await projectRow.click();
    await expect(page).toHaveURL(/\/projects\/side-experiment/, { timeout: 30_000 });

    // Doc — an M14 public route from inside the app
    await openPalette(page);
    await page.getByLabel("Command palette").fill("editorial register");
    const docRow = palette(page).getByRole("button", { name: /The editorial register/ });
    await expect(docRow).toBeVisible({ timeout: 15_000 });
    await docRow.click();
    await expect(page).toHaveURL(/\/docs\/the-editorial-register/, { timeout: 30_000 });

    // Action — file a ticket
    await page.goto("/today");
    await openPalette(page);
    await page.getByLabel("Command palette").fill("file a ticket");
    await expect(page.locator("[data-palette-active]").getByText("File a Ticket…")).toBeVisible({
      timeout: 15_000,
    });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/tickets\/new/, { timeout: 30_000 });

    // "See all results" hands off to /search (the recorded entry call)
    await openPalette(page);
    await page.getByLabel("Command palette").fill("export");
    await palette(page)
      .getByRole("button", { name: /See all results for "export"/ })
      .click();
    await expect(page).toHaveURL(/\/search\?q=export/, { timeout: 30_000 });
  });

  test("/search: grouped honest results, type chips filter, exact ref ranks first, empty state", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await signIn(page);

    await page.goto("/search?q=export");
    // grouped: the kind column names each corpus (LL:138)
    await expect(page.getByText("Add export to CSV").first()).toBeVisible();
    await expect(page.getByText("Ticket", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Run", { exact: true }).first()).toBeVisible();
    // honest match highlight rides the title
    await expect(page.locator("ol .bg-amber-200\\/60").first()).toBeVisible();

    // type chips are real ?type= filters
    await page.getByRole("button", { name: /^Runs/ }).click();
    await expect(page).toHaveURL(/type=run/);
    await expect(page.getByText("Ticket", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Run", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /^Everything/ }).click();
    await expect(page).not.toHaveURL(/type=/);

    // exact ref outranks everything; the row opens the real route
    await page.goto("/search?q=T-249");
    const firstRow = page.locator("ol > li").first();
    await expect(firstRow.getByText("Add JSON export endpoint")).toBeVisible();
    await firstRow.getByRole("link").click();
    await expect(page).toHaveURL(/\/tickets\/T-249/, { timeout: 30_000 });

    // docs + context terms answer from the same page
    await page.goto("/search?q=storefront");
    await expect(page.getByText("Context term", { exact: true }).first()).toBeVisible();
    await page.goto("/search?q=bridge");
    await expect(page.getByText("Doc", { exact: true }).first()).toBeVisible();

    // §2.17 palette-shape empty state, honest suggestion
    await page.goto("/search?q=zzz-quixotic-nothing");
    await expect(page.getByText("Nothing matches")).toBeVisible();

    // the query lands in the rail's recent searches (localStorage)
    await page.goto("/search?q=export");
    await expect(page.getByText("Recent searches")).toBeVisible();
    await expect(
      page.locator("aside").getByText("zzz-quixotic-nothing"),
    ).toBeVisible();
  });

  test("Today + inbox rows link to their Run/Ticket pages; the derived claim renders over the seed", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page);

    // the seeded review set (T-247 · T-301) is enrichment-disjoint, so
    // the E:362 claim + hero clause render — derived, not asserted copy
    await expect(page.getByText("are parallel-safe. A single Ship Group")).toBeVisible();
    await expect(page.getByText("file-sets disjoint")).toBeVisible();
    await expect(page.getByText("of them parallel-safe.")).toBeVisible();
    const shipButton = page.getByRole("button", { name: /ship 2 now/i });
    await expect(shipButton).toBeVisible();
    await expect(shipButton).toBeEnabled(); // R-9 is review-ready — a real request exists

    // active-run row → /runs/[ref] (R-12 runs the strip's running row)
    await page.locator('a[href="/runs/R-12"]').first().click();
    await expect(page).toHaveURL(/\/runs\/R-12/, { timeout: 30_000 });

    // recent ticket row → /tickets/[ref]
    await page.goto("/today");
    await page.locator('a[href^="/tickets/T-"]').first().click();
    await expect(page).toHaveURL(/\/tickets\/T-/, { timeout: 30_000 });

    // inbox rows: a Run row opens the run, a ticket row the ticket
    await page.goto("/inbox");
    await expect(page.locator('a[href^="/runs/R-"]').first()).toBeVisible();
    await page.locator('a[href^="/runs/R-"]').first().click();
    await expect(page).toHaveURL(/\/runs\/R-/, { timeout: 30_000 });
    await page.goto("/inbox");
    await page.locator('ol a[href^="/tickets/T-"]').first().click();
    await expect(page).toHaveURL(/\/tickets\/T-/, { timeout: 30_000 });
  });
});
