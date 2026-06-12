// M13 — convergence captures (master plan §5.5–5.6): the T tickets view
// + both composed emails at 1920/1440/1280 beside their /dev-variants
// renders, into notes/m13-captures/. Fixture tickets replay T's mock
// density (shipped-with-note, needs-info-with-question, in-progress,
// backlog) so the renders are comparable. Self-cleaning ("e2e-m13c").
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { eq, inArray, like, or, sql } from "drizzle-orm";

import { db } from "../src/db/client";
import {
  feedEvents,
  inboxReadMarks,
  invites,
  memberships,
  notificationOutbox,
  notificationPreferences,
  projectMembers,
  projects,
  tickets,
  userPreferences,
} from "../src/db/schema";

const CAPTURE_DIR = join(__dirname, "..", "..", "notes", "m13-captures");
const RUN = Date.now();
const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const OWNER_EMAIL = `e2e-m13c-owner-${RUN}@example.com`;
const COLLAB_EMAIL = `e2e-m13c-carmen-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

let magicLink = "";

async function captureAcrossViewports(page: Page, slug: string) {
  await page.mouse.move(0, 0);
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; }",
  });
  for (const { w, h } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: join(CAPTURE_DIR, `${slug}-${w}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function cleanupRows() {
  const mine = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M13C %"));
  const userIds = mine.map((m) => m.userId);
  await db.execute(sql`
    delete from notification_outbox
    where recipient_email like 'e2e-m13c-%'
       or ticket_id in (select id from tickets where title like 'E2E M13C%')
       or feed_event_id in (select id from feed_events where summary like '%E2E M13C%')
  `);
  await db
    .delete(feedEvents)
    .where(
      or(
        like(feedEvents.summary, "%e2e-m13c%"),
        like(feedEvents.summary, "%E2E M13C%"),
        like(feedEvents.actor, "E2E M13C%"),
        like(feedEvents.actor, "e2e-m13c-%"),
        userIds.length
          ? inArray(sql`${feedEvents.payload}->>'userId'`, userIds)
          : sql`false`,
      ),
    );
  await db.delete(tickets).where(like(tickets.title, "E2E M13C%"));
  if (userIds.length) {
    await db.delete(projectMembers).where(inArray(projectMembers.userId, userIds));
    await db.delete(userPreferences).where(inArray(userPreferences.userId, userIds));
    await db.delete(inboxReadMarks).where(inArray(inboxReadMarks.userId, userIds));
    await db
      .delete(notificationPreferences)
      .where(inArray(notificationPreferences.userId, userIds));
  }
  await db.delete(invites).where(like(invites.email, "e2e-m13c-%"));
  await db.delete(memberships).where(like(memberships.displayName, "E2E M13C %"));
}

test.beforeAll(async () => {
  mkdirSync(CAPTURE_DIR, { recursive: true });
  await cleanupRows();
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M13 — capture rig", () => {
  test("bootstrap: owner → invite → collaborator with T-density tickets", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M13C Owner");
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByPlaceholder("ATLAS-OWNER-...").fill(OWNER_CODE);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 30_000 });

    await page.goto("/projects/acme-website/members");
    await page.getByPlaceholder("name@example.com").fill(COLLAB_EMAIL);
    await page.getByRole("button", { name: /create invite/i }).click();
    await expect(page.getByText("Invite created · share the link")).toBeVisible({
      timeout: 30_000,
    });
    magicLink = (await page.locator(".select-all").first().textContent())!.trim();

    const ctx = await browser.newContext();
    const invitee = await ctx.newPage();
    await invitee.goto(magicLink.replace(/^https?:\/\/[^/]+/, ""));
    await invitee.getByRole("button", { name: /accept invite/i }).click();
    await invitee.getByPlaceholder("What Collaborators will see").fill("E2E M13C Carmen");
    await invitee.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await invitee.getByRole("button", { name: /create account/i }).click();
    await expect(invitee).toHaveURL(/\/onboarding/, { timeout: 30_000 });
    await ctx.close();

    // T-density fixture tickets (T:26–74's spread), via the DB
    const [member] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.displayName, "E2E M13C Carmen"));
    const [acme] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, "acme-website"));
    const mk = (n: number, title: string, state: string, daysAgo: number, movedAgo: number) => ({
      ref: `T-9${RUN % 10000}${n}`,
      projectId: acme.id,
      title,
      state: state as "triage",
      reporter: COLLAB_EMAIL,
      reporterUserId: member.userId,
      seeded: false,
      createdAt: new Date(Date.now() - daysAgo * 86_400_000),
      updatedAt: new Date(Date.now() - movedAgo * 86_400_000),
    });
    const fixtureTickets = await db
      .insert(tickets)
      .values([
        mk(1, "E2E M13C Add CSV export to ticket list", "in-progress", 0.1, 0.05),
        mk(2, "E2E M13C Onboarding screenshots are stale", "review-ready", 0.2, 0.01),
        mk(3, "E2E M13C Add JSON export endpoint", "shipped", 3, 2),
        mk(4, "E2E M13C Buttons look off on iPad portrait", "needs-info", 4, 2),
        mk(5, "E2E M13C Slow first paint on slow phones", "backlog", 60, 30),
      ])
      .returning({ id: tickets.id, ref: tickets.ref, title: tickets.title });
    // owner notes (T:230's quote blocks): a needs-info question + a shipped note
    const needsInfo = fixtureTickets[3];
    const shippedT = fixtureTickets[2];
    await db.insert(feedEvents).values([
      {
        kind: "moved",
        actor: "E2E M13C Owner",
        summary: `${needsInfo.ref} — ${needsInfo.title}`,
        preview: "Could you share a screenshot? I'm trying to repro on an iPad mini.",
        projectId: acme.id,
        ticketId: needsInfo.id,
        ticketRef: needsInfo.ref,
        payload: { from: "triage", to: "needs-info" },
        seeded: false,
      },
      {
        kind: "replied",
        actor: "E2E M13C Owner",
        summary: `${shippedT.ref} — ${shippedT.title}`,
        preview: "Try downloading the ticket list and you'll see a new 'JSON' option.",
        projectId: acme.id,
        ticketId: shippedT.id,
        ticketRef: shippedT.ref,
        seeded: false,
      },
    ]);
  });

  test("capture T + the emails at 1920/1440/1280 (+ variant references)", async ({ page }) => {
    test.setTimeout(600_000);
    // collab sign-in
    await page.goto("/sign-in");
    await page.getByPlaceholder("you@example.com").fill(COLLAB_EMAIL);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in/i }).click();
    await expect(page).toHaveURL(/\/inbox/, { timeout: 30_000 });

    // T — the collab tickets view
    await page.goto("/tickets", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "What you’ve filed." })).toBeVisible();
    await page.waitForTimeout(1000);
    await captureAcrossViewports(page, "tickets");

    // evidence captures (derived surfaces — no variant convergence loop):
    // the collab inbox + the needs-info ticket detail at 1440
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.mouse.move(0, 0);
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; }",
    });
    await page.screenshot({ path: join(CAPTURE_DIR, "inbox-collab-1440.png"), fullPage: true });
    await page.goto("/tickets", { waitUntil: "domcontentloaded" });
    await page
      .locator("li", { hasText: "Buttons look off on iPad" })
      .first()
      .getByRole("link", { name: "reply to the Owner →" })
      .click();
    await expect(page.getByText("The conversation")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; }",
    });
    await page.screenshot({ path: join(CAPTURE_DIR, "ticket-collab-1440.png"), fullPage: true });

    // the composed emails (the delivery truth — /dev-emails renders the
    // byte-true html the Notifier hands Resend)
    for (const kind of ["ship", "digest"]) {
      await page.goto(`/dev-emails/${kind}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      await captureAcrossViewports(page, `email-${kind}`);
    }

    // variant references at the canonical width
    for (const key of ["t", "aa", "yy"]) {
      await page.goto(`/dev-variants/${key}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await page.mouse.move(0, 0);
      await page.addStyleTag({
        content: "*, *::before, *::after { animation: none !important; }",
      });
      await page.screenshot({
        path: join(CAPTURE_DIR, `variant-${key}-1440.png`),
        fullPage: true,
      });
    }
  });
});
