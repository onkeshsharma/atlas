// M13 — the Collaborator loop, end to end (charter done criterion 1):
// invite → accept → the scoped inbox + role nav → file a request from
// the scoped picker → plain-English states on /tickets + the detail →
// reply round-trip → Owner ships (real domain writers over the real
// seams) → the cron pass composes the ship notification (outbox row =
// the delivery evidence; no key, status `composed`) → the collab sees
// the plain-English closure + verify prose → forced digest (idempotent)
// → the prefs flow flips a real row that the next compose honors →
// per-user read marks leave the Owner's untouched. Scoping is proven
// at every layer (criterion 2): picker options, list rows, 404 on an
// off-roster ref, owner-page redirects.
// Self-cleaning via the "e2e-m13" / "E2E M13" markers.
import { expect, test, type Page } from "@playwright/test";

import { signInAsOwner } from "./support/sign-in";
import { and, eq, inArray, isNull, like, or, sql } from "drizzle-orm";

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
  runs,
  tickets,
  userPreferences,
} from "../src/db/schema";
import { applyTicketTransition } from "../src/domain/ticket/mutations";
import { shipRun } from "../src/domain/run/bridge-writers";

const OWNER_CODE = process.env.ATLAS_OWNER_CODE!;
const CRON_SECRET = process.env.CRON_SECRET!;
const RUN = Date.now();
const OWNER_EMAIL = `e2e-m13-owner-${RUN}@example.com`;
const COLLAB_EMAIL = `e2e-m13-carmen-${RUN}@example.com`;
const PASSWORD = "editorial-register-16";
const TICKET_TITLE = `E2E M13 export menu is buried (${RUN})`;

let magicLink = "";
let collabUserId = "";
let acmeId = "";
let ticketRef = "";
let ticketId = "";

async function signInAsCollab(page: Page): Promise<void> {
  // the owner helper expects /today; the Collaborator lands /inbox
  for (let attempt = 0; ; attempt++) {
    await page.goto("/sign-in");
    await page.getByPlaceholder("you@example.com").fill(COLLAB_EMAIL);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in/i }).click();
    try {
      await expect(page).toHaveURL(/\/inbox/, { timeout: 30_000 });
      return;
    } catch (err) {
      if (attempt >= 1) throw err;
    }
  }
}

async function cleanupRows() {
  const mine = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "E2E M13 %"));
  const userIds = mine.map((m) => m.userId);
  await db.execute(sql`
    delete from notification_outbox
    where recipient_email like 'e2e-m13-%'
       or feed_event_id in (select id from feed_events where summary like '%E2E M13%')
       or ticket_id in (select id from tickets where title like 'E2E M13%')
  `);
  await db
    .delete(feedEvents)
    .where(
      or(
        like(feedEvents.summary, "%e2e-m13%"),
        like(feedEvents.summary, "%E2E M13%"),
        like(feedEvents.actor, "E2E M13%"),
        like(feedEvents.actor, "e2e-m13-%"),
        userIds.length
          ? inArray(sql`${feedEvents.payload}->>'userId'`, userIds)
          : sql`false`,
      ),
    );
  // the filing action enqueues a Helper Run ("Enrich T-…") on the new
  // ticket whose title/feed summary DON'T carry the marker — sweep feed
  // rows + runs BY TICKET before the tickets delete, or the FKs trip.
  await db.execute(sql`
    delete from feed_events
    where ticket_id in (select id from tickets where title like 'E2E M13%')
       or run_id in (select id from runs where ticket_id in (select id from tickets where title like 'E2E M13%'))
  `);
  await db.delete(runs).where(like(runs.title, "E2E M13%"));
  await db.execute(
    sql`delete from runs where ticket_id in (select id from tickets where title like 'E2E M13%')`,
  );
  await db.delete(tickets).where(like(tickets.title, "E2E M13%"));
  if (userIds.length) {
    await db.delete(projectMembers).where(inArray(projectMembers.userId, userIds));
    await db.delete(userPreferences).where(inArray(userPreferences.userId, userIds));
    await db.delete(inboxReadMarks).where(inArray(inboxReadMarks.userId, userIds));
    await db
      .delete(notificationPreferences)
      .where(inArray(notificationPreferences.userId, userIds));
  }
  await db.delete(invites).where(like(invites.email, "e2e-m13-%"));
  await db.delete(memberships).where(like(memberships.displayName, "E2E M13 %"));
}

test.beforeAll(async () => {
  await cleanupRows();
  const [acme] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, "acme-website"));
  acmeId = acme.id;
});

test.afterAll(async () => {
  await cleanupRows();
});

test.describe.serial("M13 — the Collaborator loop is real", () => {
  test("owner bootstrap + invite on acme-website", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-up");
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M13 Owner");
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
    expect(magicLink).toMatch(/\/invite\/inv_/);
  });

  test("accept → collaborator account → lands on onboarding", async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(magicLink.replace(/^https?:\/\/[^/]+/, ""));
    await page.getByRole("button", { name: /accept invite/i }).click();
    await expect(page).toHaveURL(/\/sign-up\?invite=/);
    await page.getByPlaceholder("What Collaborators will see").fill("E2E M13 Carmen");
    await page.getByPlaceholder("At least 12 characters").fill(PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
    await ctx.close();

    const [member] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.displayName, "E2E M13 Carmen"));
    expect(member.role).toBe("collaborator");
    collabUserId = member.userId;
  });

  test("the collab inbox: scoped rows, collab rail, role nav", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsCollab(page);

    // Z's restored collab rail copy
    await expect(page.getByText("Tickets you filed: shipped, replied, declined")).toBeVisible();
    await expect(page.getByText("Project-wide ships (only if you have a stake)")).toBeVisible();
    await expect(page.getByRole("link", { name: "Tune notifications →" })).toBeVisible();

    // SCOPING (criterion 2): acme rows render; atlas-internal rows never do.
    // T-310 is a seeded acme feed row; T-149 lives on atlas-internal.
    await expect(page.getByText("T-310").first()).toBeVisible();
    await expect(page.getByText("Mermaid renders blank on iOS")).toHaveCount(0);
    await expect(page.getByText("T-149")).toHaveCount(0);

    // role nav: Tickets present, Board/Today absent (the role-derived rail)
    await expect(page.locator('nav a[href="/tickets"]')).toHaveCount(1);
    await expect(page.locator('nav a[href="/board"]')).toHaveCount(0);
    await expect(page.locator('nav a[href="/today"]')).toHaveCount(0);
  });

  test("file a request: the picker is roster-scoped; the T view tells it plainly", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsCollab(page);
    await page.goto("/tickets/new");

    // the collab lede + the scoped project pick (no atlas-internal option)
    await expect(page.getByText("you’ll hear back when it ships", { exact: false })).toBeVisible();
    const options = page.locator('select[name="projectId"] option');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toHaveText("acme-website");

    await page.locator('input[name="title"]').fill(TICKET_TITLE);
    await page
      .locator('textarea[name="body"]')
      .fill("I can never find the export button. Could it live in the toolbar?");
    await page.getByRole("button", { name: /file this ticket/i }).click();

    // lands on the COLLAB detail view (plain-English, no Owner chrome)
    await expect(page.getByRole("heading", { name: TICKET_TITLE })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Atlas is reviewing this").first()).toBeVisible();
    await expect(page.getByText("What you asked for")).toBeVisible();
    // none of F's Owner anatomy leaks
    await expect(page.getByText("If dispatched")).toHaveCount(0);

    const [row] = await db.select().from(tickets).where(eq(tickets.title, TICKET_TITLE));
    ticketRef = row.ref;
    ticketId = row.id;
    expect(row.reporterUserId).toBe(collabUserId); // the Notifier's contract
    expect(row.reporter.toLowerCase()).toBe(COLLAB_EMAIL.toLowerCase());
  });

  test("the T list: plain states, filters, the You rail", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsCollab(page);
    await page.goto("/tickets");

    await expect(page.getByRole("heading", { name: "What you’ve filed." })).toBeVisible();
    const row = page.locator("li", { hasText: TICKET_TITLE });
    await expect(row.getByText("Atlas is reviewing this")).toBeVisible();
    await expect(page.getByText("1 Ticket filed")).toBeVisible();

    // filters are real ?show= params
    await page.getByRole("button", { name: "Shipped" }).click();
    await expect(page).toHaveURL(/show=shipped/);
    await expect(page.locator("li", { hasText: TICKET_TITLE })).toHaveCount(0);
    await page.getByRole("button", { name: "Still open" }).click();
    await expect(page.locator("li", { hasText: TICKET_TITLE })).toBeVisible();
  });

  test("the reply round-trip writes through the outboxed mutation (PRD #47)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsCollab(page);
    await page.goto(`/tickets/${ticketRef}`);

    await page
      .locator('textarea[name="text"]')
      .fill("Happy to share a screen recording if that helps.");
    await page.getByRole("button", { name: /send reply/i }).click();

    // the thread shows the quoted line
    await expect(page.getByText("Happy to share a screen recording", { exact: false })).toBeVisible(
      { timeout: 30_000 },
    );

    const replied = await db
      .select()
      .from(feedEvents)
      .where(and(eq(feedEvents.ticketId, ticketId), eq(feedEvents.kind, "replied")));
    expect(replied).toHaveLength(1);
    expect(replied[0].preview).toContain("screen recording");
  });

  test("SCOPING PROOF: off-roster refs 404; Owner pages bounce; prefs page is collab-chromed", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsCollab(page);

    // an atlas-internal seeded ticket — the collab is not on that roster
    const resp = await page.goto("/tickets/T-149");
    expect(resp?.status()).toBe(404);

    // owner surfaces redirect away (requireOwner / role branches)
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/tickets/);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/onboarding/);
    await page.goto("/board");
    await expect(page).toHaveURL(/\/onboarding/);

    // their prefs page renders the collab chrome over the real table
    await page.goto("/settings/notifications");
    await expect(page.getByText("Your email record")).toBeVisible();
    await expect(page.getByText("Owner-only", { exact: false })).toHaveCount(0);
  });

  test("Owner ships → the cron pass composes the outbox row (the delivery evidence)", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    // the Owner walks the ticket through the REAL legal transitions
    // (triage → approved → in-progress → review-ready), then the run
    // lands through shipRun — the same writer the daemon posts through.
    for (const [from, to] of [
      ["triage", "approved"],
      ["approved", "in-progress"],
      ["in-progress", "review-ready"],
    ] as const) {
      const moved = await applyTicketTransition({ ticketId, from, to, actor: "you" });
      expect(moved.ok).toBe(true);
    }
    const [run] = await db
      .insert(runs)
      .values({
        ref: `R-${RUN % 100000}`,
        projectId: acmeId,
        ticketId,
        title: `E2E M13 run (${RUN})`,
        state: "review-ready",
        lane: "owner",
        diffStats: {
          filesChanged: 1,
          insertions: 14,
          deletions: 2,
          files: [{ path: "src/ui/Toolbar.tsx", insertions: 14, deletions: 2 }],
        },
        seeded: false,
      })
      .returning({ id: runs.id });
    const shipped = await shipRun({ runId: run.id, mergeSha: "e".repeat(40) });
    expect(shipped.ok).toBe(true);
    const ticketShip = await applyTicketTransition({
      ticketId,
      from: "review-ready",
      to: "shipped",
      actor: "Engine",
    });
    expect(ticketShip.ok).toBe(true);

    // the cron pass (catch-up form — ADR-0003): composes the miss
    const res = await request.get("/api/notifier/cron", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { ok: boolean; ships: number; delivered: number };
    expect(body.ok).toBe(true);
    expect(body.ships).toBeGreaterThanOrEqual(1);
    expect(body.delivered).toBe(0); // no key in the suite — NOTHING sends

    // the outbox row IS the evidence: composed, addressed, never sent
    const rows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.ticketId, ticketId));
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("ship");
    expect(rows[0].status).toBe("composed");
    expect(rows[0].recipientEmail.toLowerCase()).toBe(COLLAB_EMAIL.toLowerCase());
    expect(rows[0].subject).toContain("is shipped");
    expect(rows[0].html).toContain("what the Engine did, in plain language");
    expect(rows[0].providerId).toBeNull();

    // a second pass composes nothing twice (structural idempotency)
    const again = await request.get("/api/notifier/cron", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(((await again.json()) as { ships: number }).ships).toBe(0);

    // unauthed callers are refused
    const unauthorized = await request.get("/api/notifier/cron");
    expect(unauthorized.status()).toBe(401);
    void page;
  });

  test("the collab sees the plain-English closure + the verify prose", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsCollab(page);

    await page.goto("/tickets");
    const row = page.locator("li", { hasText: TICKET_TITLE });
    await expect(row.getByText("Shipped", { exact: true })).toBeVisible();
    await row.getByRole("link", { name: "see what changed →" }).click();

    await expect(page).toHaveURL(new RegExp(`/tickets/${ticketRef}`));
    await expect(page.getByText("See what changed")).toBeVisible();
    // the page renders the SAME verify sentence the email carries
    await expect(page.getByText("open acme-website and try what you asked for", { exact: false })).toBeVisible();
    await expect(page.getByText("what the Engine did, in plain language")).toBeVisible();
  });

  test("forced digest composes per-Collaborator, idempotently", async ({ request }) => {
    test.setTimeout(120_000);
    const res = await request.get("/api/notifier/cron?force=digest", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const body = (await res.json()) as { digests: number };
    expect(body.digests).toBeGreaterThanOrEqual(1);

    const rows = await db
      .select()
      .from(notificationOutbox)
      .where(
        and(
          eq(notificationOutbox.recipientUserId, collabUserId),
          eq(notificationOutbox.kind, "digest"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].periodKey).toMatch(/-forced$/);
    expect(rows[0].subject).toContain("shipped on acme-website this week");
    expect(rows[0].text).toContain("WHAT SHIPPED");
    expect(rows[0].html).toContain(TICKET_TITLE); // their ship is in it

    // forcing again inside the same week is a no-op (the period key)
    const again = await request.get("/api/notifier/cron?force=digest", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(((await again.json()) as { digests: number }).digests).toBe(0);
  });

  test("the prefs flow: a UI flip becomes a row the next compose honors", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    await signInAsCollab(page);
    await page.goto("/settings/notifications");

    // flip frequency to Off (CC's segment — saves on change). Scoped to
    // the How-often section: the per-event OnOff rows also say "Off".
    const howOften = page.locator("section", { hasText: "How often" }).first();
    await howOften.getByRole("button", { name: "Off", exact: true }).click();
    await expect
      .poll(
        async () => {
          const [row] = await db
            .select()
            .from(notificationPreferences)
            .where(eq(notificationPreferences.userId, collabUserId));
          return row?.frequency;
        },
        { timeout: 15_000 },
      )
      .toBe("off");

    // a second shipped ticket now lands as skipped-pref — the audit row
    const [t2] = await db
      .insert(tickets)
      .values({
        ref: `T-${(RUN % 100000) + 1}e`,
        projectId: acmeId,
        title: `E2E M13 second ship (${RUN})`,
        state: "shipped",
        reporter: COLLAB_EMAIL,
        reporterUserId: collabUserId,
        seeded: false,
      })
      .returning({ id: tickets.id, ref: tickets.ref });
    await db.insert(feedEvents).values({
      kind: "shipped",
      actor: "Engine",
      summary: `${t2.ref} — E2E M13 second ship (${RUN})`,
      projectId: acmeId,
      ticketId: t2.id,
      ticketRef: t2.ref,
      seeded: false,
    });
    await request.get("/api/notifier/cron", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });

    const rows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.ticketId, t2.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("skipped-pref");
    expect(rows[0].error).toBe("frequency off");

    // restore for any later assertions
    await howOften.getByRole("button", { name: "Instant" }).click();
    await expect
      .poll(async () => {
        const [row] = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, collabUserId));
        return row?.frequency;
      })
      .toBe("instant");
  });

  test("per-user read marks: the collab's mark-all-read leaves the Owner's unread alone", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const ownerUnreadBefore = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(feedEvents)
      .where(isNull(feedEvents.readAt));

    await signInAsCollab(page);
    await expect(page).toHaveURL(/\/inbox/);
    // unread exist (the loop above generated plenty)
    await expect(page.getByRole("button", { name: "mark all read →" })).toBeVisible();
    await page.getByRole("button", { name: "mark all read →" }).click();
    await expect(page.getByText("0 new", { exact: false })).toBeVisible({ timeout: 30_000 });

    // the per-user mark moved …
    const [mark] = await db
      .select()
      .from(inboxReadMarks)
      .where(eq(inboxReadMarks.userId, collabUserId));
    expect(mark.lastReadEventId).toBeGreaterThan(0);
    // … and the Owner's instance-level marker did NOT
    const ownerUnreadAfter = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(feedEvents)
      .where(isNull(feedEvents.readAt));
    expect(ownerUnreadAfter[0].n).toBe(ownerUnreadBefore[0].n);
  });

  test("the Owner's side of the loop is intact: the reply landed in their inbox", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsOwner(page, OWNER_EMAIL, PASSWORD);
    await page.goto("/inbox?show=replies");
    await expect(page.getByText("screen recording", { exact: false }).first()).toBeVisible();
    // the Owner inbox keeps its Owner rail (no collab copy bleed)
    await expect(page.getByText("Ships and finished Runs across your projects")).toBeVisible();
  });
});
