// M16 — /insights over the REAL seeded record (charter item 4):
// 1. the surface renders numbers the domain derives from the same DB the
//    spec reads — asserted against insightsData() itself, never hardcoded;
// 2. the ?range= filter re-derives (30d · 12w · all);
// 3. the CSV export serves the same read;
// 4. EMPTY-INSTANCE HONESTY: the seeded universe is swept and every
//    section must say what's absent (§2.17) — afterAll reseeds (the
//    m6-cockpit idiom).
// Owner bootstrap self-cleans; workers:1 law applies (CLAUDE.md).
import { execSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import { inArray, like, sql } from "drizzle-orm";

import { db } from "../src/db/client";
import { memberships, userPreferences } from "../src/db/schema";
import { formatDuration } from "../src/domain/insights/derive";
import { insightsData } from "../src/domain/insights/queries";
import { signInAsOwner } from "./support/sign-in";

const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m16-owner-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";

async function cleanupOwner() {
  const owners = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M16 %"));
  if (owners.length) {
    await db
      .delete(userPreferences)
      .where(inArray(userPreferences.userId, owners.map((o) => o.userId)));
  }
  await db.delete(memberships).where(like(memberships.displayName, "E2E M16 %"));
}

test.beforeAll(async () => {
  await cleanupOwner();
});

test.afterAll(async () => {
  await cleanupOwner();
  // the sweep test empties the seeded universe — put it back for the
  // suites that follow (m6-cockpit's afterAll idiom).
  execSync("node scripts/seed-demo.mjs", { cwd: join(__dirname, "..") });
});

test.describe.serial("M16 — insights over real rows", () => {
  test("owner bootstrap", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M16 Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });
  });

  test("/insights renders the numbers the domain derives — hero, chart, percentiles, projects, stragglers, rail", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const data = await insightsData("12w");
    expect(data.throughput.totalShipped).toBeGreaterThan(0); // seed sanity
    expect(data.pairCount).toBeGreaterThan(0);

    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/insights", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "How you’re shipping." })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Insights · last 12 weeks")).toBeVisible();

    // hero numerals are the derivation's, verbatim
    const hero = page.locator("p").filter({ hasText: "median time-to-ship." }).first();
    await expect(hero).toContainText(
      `${data.throughput.totalShipped} Tickets shipped over 12 weeks`,
    );
    await expect(hero).toContainText(`${data.throughput.totalFailed} failed`);
    await expect(hero).toContainText(`~${formatDuration(data.medianMs!)} median time-to-ship`);

    // throughput figure: 12-week axis with the current week labelled w12
    await expect(page.getByRole("heading", { name: "Weekly throughput" })).toBeVisible();
    await expect(page.getByText("12 weeks", { exact: true })).toBeVisible();
    await expect(page.getByText("w12", { exact: true })).toBeVisible();
    await expect(page.getByText("Fig. 1 — weekly throughput, stacked")).toBeVisible();

    // percentile rows carry the derived values
    await expect(page.getByText("Median (P50)")).toBeVisible();
    const p50 = data.percentiles[1];
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^Median \(P50\)/ })
        .getByText(formatDuration(p50.ms))
        .first(),
    ).toBeVisible();
    await expect(page.getByText(`across ${data.pairCount} shipped Tickets`)).toBeVisible();

    // per-project rows derive ships/share and link to the project
    const top = data.projects[0];
    const projectRow = page.locator("li").filter({ hasText: `${top.sharePct}% of all ships` });
    await expect(projectRow.getByText(`${top.shipped} shipped`)).toBeVisible();
    await expect(page.getByText(`${data.projects.length} active`)).toBeVisible();

    // stragglers are the derived set, oldest first, linking to tickets
    expect(data.stragglers.length).toBeGreaterThan(0); // seed has long-sitting open tickets
    const straggler = data.stragglers[0];
    const strgRow = page.locator("li").filter({ hasText: straggler.ref });
    await expect(strgRow.getByText(straggler.title)).toBeVisible();
    await expect(
      page.locator(`a[href="/tickets/${straggler.ref}"]`).first(),
    ).toBeVisible();

    // rail: velocity stats + the named Engine-hours gap + Owner-only note
    await expect(page.getByText("Helper Runs")).toBeVisible();
    await expect(
      page.getByText(`${data.helpers.helper} of ${data.helpers.total}`),
    ).toBeVisible();
    await expect(
      page.getByText("Engine hours aren’t tracked, so there’s no quota meter here."),
    ).toBeVisible();
    await expect(page.getByText("These are Owner-only", { exact: false })).toBeVisible();

    // Engine suggests derives the slowest project for real
    if (data.slowest) {
      await expect(page.getByText("Engine suggests")).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(`Open ${data.slowest.name} Context`, "i") }),
      ).toBeVisible();
    }
  });

  test("?range= re-derives the window — 30d and all time", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/insights", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "How you’re shipping." })).toBeVisible({
      timeout: 30_000,
    });

    // 30d via the real segmented control
    const d30 = await insightsData("30d");
    await page.getByRole("button", { name: "30d" }).click();
    await expect(page).toHaveURL(/\/insights\?range=30d/);
    await expect(page.getByText("Insights · last 30 days")).toBeVisible({ timeout: 15_000 });
    const hero30 = page.locator("p").filter({ hasText: "median time-to-ship." }).first();
    await expect(hero30).toContainText(
      `${d30.throughput.totalShipped} Tickets shipped over the last 30 days`,
    );

    // all time — no comparison window, honestly said
    const dAll = await insightsData("all");
    await page.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(/\/insights\?range=all/);
    await expect(page.getByText("Insights · all time")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("no earlier period to compare", { exact: true })).toBeVisible();
    const heroAll = page.locator("p").filter({ hasText: "median time-to-ship." }).first();
    await expect(heroAll).toContainText(
      `${dAll.throughput.totalShipped} Tickets shipped all time`,
    );
  });

  test("the CSV export serves the same read", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    const res = await page.request.get("/insights/export?range=30d");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(res.headers()["content-disposition"]).toContain("atlas-insights-30d.csv");
    const body = await res.text();
    expect(body).toContain("atlas insights,last 30 days");
    expect(body).toContain("week,shipped,failed");
    const d30 = await insightsData("30d");
    expect(body).toContain(`tickets shipped,${d30.throughput.totalShipped}`);
  });

  test("EMPTY-INSTANCE HONESTY — a swept record names every gap (§2.17)", async ({ page }) => {
    test.setTimeout(180_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);

    // sweep the seeded universe (the seed script's own wipe order —
    // afterAll reseeds). Honest rows born on seeded parents go with them.
    await db.execute(sql`delete from notification_outbox where
      feed_event_id in (select id from feed_events where seeded or project_id in (select id from projects where seeded))
      or ticket_id in (select id from tickets where seeded or project_id in (select id from projects where seeded))
      or project_id in (select id from projects where seeded)`);
    await db.execute(
      sql`delete from feed_events where seeded or project_id in (select id from projects where seeded)`,
    );
    await db.execute(
      sql`delete from ticket_pins where seeded or ticket_id in (select id from tickets where seeded)`,
    );
    await db.execute(
      sql`delete from ticket_links where seeded or blocker_id in (select id from tickets where seeded) or blocked_id in (select id from tickets where seeded)`,
    );
    await db.execute(
      sql`delete from context_terms where seeded or project_id in (select id from projects where seeded)`,
    );
    await db.execute(
      sql`delete from run_stdout_chunks where run_id in (select id from runs where seeded or project_id in (select id from projects where seeded))`,
    );
    await db.execute(
      sql`update runs set brief_id = null where seeded or project_id in (select id from projects where seeded)`,
    );
    await db.execute(
      sql`delete from briefs where seeded or ticket_id in (select id from tickets where seeded)`,
    );
    await db.execute(
      sql`delete from runs where seeded or project_id in (select id from projects where seeded)`,
    );
    await db.execute(
      sql`delete from tickets where seeded or project_id in (select id from projects where seeded)`,
    );
    await db.execute(
      sql`delete from project_members where project_id in (select id from projects where seeded)`,
    );
    await db.execute(
      sql`update invites set project_id = null where project_id in (select id from projects where seeded)`,
    );
    await db.execute(sql`delete from projects where seeded`);

    await page.goto("/insights", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "How you’re shipping." })).toBeVisible({
      timeout: 30_000,
    });

    // hero: zeros + an unmeasured median, not invented numbers
    const hero = page.locator("p").filter({ hasText: "median time-to-ship." }).first();
    await expect(hero).toContainText("0 Tickets shipped over 12 weeks");
    await expect(hero).toContainText("— median time-to-ship");
    await expect(page.getByText("no ships in either window yet", { exact: true })).toBeVisible();

    // every section says what's absent
    await expect(page.getByText("No ships in this window yet", { exact: false })).toBeVisible();
    await expect(
      page.getByText("No Ticket has gone filed → shipped in this window yet", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("No Project shipped or failed anything in this window."),
    ).toBeVisible();
    await expect(page.getByText("Nothing here.")).toBeVisible();
    await expect(
      page.getByText("Nothing is sitting longer than typical — that's a good thing."),
    ).toBeVisible();
    await expect(
      page.getByText("dispatch and ship a few Tickets and this read starts talking", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("No measured ships in this window yet", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("0 active", { exact: true })).toBeVisible();
  });
});
