/**
 * M13 — integration against the REAL Neon m13-dev DB: the Notifier's
 * outbox writers (structural idempotency on redelivery), recipient
 * resolution through THE GUARD's project_members scope, the prefs gate
 * landing as real statuses, digest composition + period-key
 * idempotence, the reply mutation's single-statement outbox write, the
 * per-user read marks, and the collab queries' scoping (a Collaborator
 * NOT on a project reads NOTHING). Self-cleaning via the "IT-M13"
 * marker (the m11 idiom). No RESEND_API_KEY exists in any test env —
 * rows land `composed`, which is exactly the assertion.
 */
import { eq, inArray, like, or, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import {
  feedEvents,
  inboxReadMarks,
  memberships,
  notificationOutbox,
  notificationPreferences,
  projectMembers,
  projects,
  runs,
  tickets,
} from "@/src/db/schema";
import {
  collabFeedEvents,
  collabTicketByRef,
  collabTickets,
  collabUnreadCount,
} from "@/src/domain/collab/queries";
import { markAllReadFor, readMarkFor } from "@/src/domain/collab/read-marks";
import { replyOnTicket } from "@/src/domain/collab/replies";
import {
  composeDigests,
  composeMissedShips,
  notifyShipForFeedEvent,
} from "@/src/domain/notifier/process";
import { outboxTally } from "@/src/domain/notifier/outbox";
import { patchNotificationPrefs } from "@/src/domain/notifications/preferences";
import { shipRun } from "@/src/domain/run/bridge-writers";
import { fileTicket } from "@/src/domain/ticket/mutations";

const MARK = `IT-M13-${Date.now()}`;
// neon_auth."user".id is a UUID; memberships.user_id stores its text form
// (the queries join on `u.id::text = m.user_id`).
const COLLAB_ID = crypto.randomUUID();
const OUTSIDER_ID = crypto.randomUUID();
const COLLAB_EMAIL = `it-m13-${Date.now()}@example.com`;
const OUTSIDER_EMAIL = `it-m13-out-${Date.now()}@example.com`;

let projectId: string; // the collab's project
let otherProjectId: string; // a project the collab is NOT on

async function cleanup() {
  // outbox rows go FIRST (they FK the feed rows below); recipients are
  // synthetic UUIDs, so the stable handle is the it-m13 email family +
  // any rows answering the about-to-be-deleted feed events.
  await db.execute(sql`
    delete from notification_outbox
    where recipient_email like 'it-m13-%'
       or feed_event_id in (
         select id from feed_events
         where summary like ${`%IT-M13-%`} or actor like 'it-m13-%'
       )
  `);
  // family-wide patterns ("IT-M13-%"), not run-scoped — a crashed run's
  // leftovers are swept by the next run (the killed-suite law, adapted).
  await db.delete(feedEvents).where(
    or(like(feedEvents.summary, "%IT-M13-%"), like(feedEvents.actor, "it-m13-%")),
  );
  await db.delete(runs).where(like(runs.title, "IT-M13-%"));
  await db.delete(tickets).where(like(tickets.title, "IT-M13-%"));
  const stale = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(like(memberships.displayName, "IT-M13-%"));
  const userIds = [...new Set([COLLAB_ID, OUTSIDER_ID, ...stale.map((s) => s.userId)])];
  await db.delete(projectMembers).where(inArray(projectMembers.userId, userIds));
  await db.delete(inboxReadMarks).where(inArray(inboxReadMarks.userId, userIds));
  await db
    .delete(notificationPreferences)
    .where(inArray(notificationPreferences.userId, userIds));
  await db.delete(memberships).where(inArray(memberships.userId, userIds));
  await db.delete(projects).where(like(projects.name, "IT-M13-%"));
  await db.execute(sql`delete from neon_auth."user" where email like 'it-m13-%'`);
}

beforeAll(async () => {
  await cleanup();
  const rows = await db
    .insert(projects)
    .values([
      { name: `${MARK} acme`, slug: `it-m13-a-${Date.now()}`, pinned: false, seeded: false },
      { name: `${MARK} secret`, slug: `it-m13-b-${Date.now()}`, pinned: false, seeded: false },
    ])
    .returning({ id: projects.id });
  projectId = rows[0].id;
  otherProjectId = rows[1].id;

  // identities: instance membership + roster row + a neon_auth email
  // (the Notifier resolves addresses through the managed user table).
  await db.insert(memberships).values([
    { userId: COLLAB_ID, role: "collaborator", displayName: `${MARK} Carmen` },
    { userId: OUTSIDER_ID, role: "collaborator", displayName: `${MARK} Sam` },
  ]);
  await db.insert(projectMembers).values({
    projectId,
    userId: COLLAB_ID,
    role: "collaborator",
    addedBy: `${MARK}-owner`,
  });
  await db.execute(sql`
    insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values
      (${COLLAB_ID}::uuid, ${`${MARK} Carmen`}, ${COLLAB_EMAIL}, true, now(), now()),
      (${OUTSIDER_ID}::uuid, ${`${MARK} Sam`}, ${OUTSIDER_EMAIL}, true, now(), now())
  `);
});

afterAll(async () => {
  await cleanup();
});

/** file a ticket as the collab + ship a run on it; returns refs + the shipped event id. */
async function shipACollabTicket(suffix: string) {
  const filed = await fileTicket({
    projectId,
    title: `${MARK} ticket ${suffix}`,
    body: "When I export, nothing happens.",
    kind: "bug",
    priority: "soon",
    reporter: COLLAB_EMAIL,
    reporterUserId: COLLAB_ID,
  });
  if (!filed.ok) throw new Error("fileTicket failed");
  const [run] = await db
    .insert(runs)
    .values({
      ref: `R-${Date.now() % 100000}-${suffix}`,
      projectId,
      ticketId: filed.id,
      title: `${MARK} run ${suffix}`,
      state: "review-ready",
      lane: "owner",
      diffStats: {
        filesChanged: 2,
        insertions: 10,
        deletions: 3,
        files: [
          { path: "src/a.ts", insertions: 7, deletions: 1 },
          { path: "src/b.ts", insertions: 3, deletions: 2 },
        ],
      },
      seeded: false,
    })
    .returning({ id: runs.id });
  const shipped = await shipRun({ runId: run.id, mergeSha: "a".repeat(40) });
  if (!shipped.ok) throw new Error("shipRun failed");
  return { ticketId: filed.id, ticketRef: filed.ref, feedEventId: shipped.feedEventId };
}

describe("ship notification composition (the outbox is the delivery evidence)", () => {
  it("composes ONE row for the reporter; redelivery composes nothing twice", async () => {
    const { feedEventId, ticketId } = await shipACollabTicket("one");

    const first = await notifyShipForFeedEvent(feedEventId);
    expect(first.composed).toBe(1);
    // the cron's catch-up + a double kick both no-op (structural idempotency)
    expect((await notifyShipForFeedEvent(feedEventId)).composed).toBe(0);
    expect((await composeMissedShips()).composed).toBe(0);

    const rows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.feedEventId, feedEventId));
    expect(rows).toHaveLength(1);
    expect(rows[0].recipientUserId).toBe(COLLAB_ID);
    expect(rows[0].recipientEmail).toBe(COLLAB_EMAIL);
    expect(rows[0].kind).toBe("ship");
    expect(rows[0].status).toBe("composed"); // no key in any test env
    expect(rows[0].providerId).toBeNull();
    expect(rows[0].subject).toContain("is shipped");
    expect(rows[0].html).toContain("what the Engine did, in plain language");
    expect(rows[0].text).toContain("2 files");
    expect(rows[0].ticketId).toBe(ticketId);
  });

  it("prefs land as real statuses: frequency off ⇒ skipped-pref, audited", async () => {
    await patchNotificationPrefs(COLLAB_ID, { frequency: "off" });
    const { feedEventId } = await shipACollabTicket("off");
    await notifyShipForFeedEvent(feedEventId);
    const [row] = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.feedEventId, feedEventId));
    expect(row.status).toBe("skipped-pref");
    expect(row.error).toBe("frequency off");
    await patchNotificationPrefs(COLLAB_ID, { frequency: "instant" });
  });

  it("plain email format composes text-only (html NULL)", async () => {
    await patchNotificationPrefs(COLLAB_ID, { emailFormat: "plain" });
    const { feedEventId } = await shipACollabTicket("plain");
    await notifyShipForFeedEvent(feedEventId);
    const [row] = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.feedEventId, feedEventId));
    expect(row.html).toBeNull();
    expect(row.emailFormat).toBe("plain");
    expect(row.text).toContain("Hi");
    await patchNotificationPrefs(COLLAB_ID, { emailFormat: "editorial" });
  });

  it("an off-roster reporter gets NOTHING (member-removed = stop notifying)", async () => {
    const { feedEventId } = await shipACollabTicket("removed");
    await db.delete(projectMembers).where(eq(projectMembers.userId, COLLAB_ID));
    const result = await notifyShipForFeedEvent(feedEventId);
    expect(result.composed).toBe(0);
    expect(
      await db
        .select()
        .from(notificationOutbox)
        .where(eq(notificationOutbox.feedEventId, feedEventId)),
    ).toHaveLength(0);
    // restore the roster row for the rest of the suite
    await db.insert(projectMembers).values({
      projectId,
      userId: COLLAB_ID,
      role: "collaborator",
      addedBy: `${MARK}-owner`,
    });
  });

  it("non-reporter roster members compose only when project-shipped is ON", async () => {
    // put the outsider ON the project but leave project-shipped default-off
    await db.insert(projectMembers).values({
      projectId,
      userId: OUTSIDER_ID,
      role: "collaborator",
      addedBy: `${MARK}-owner`,
    });
    const a = await shipACollabTicket("audience-off");
    await notifyShipForFeedEvent(a.feedEventId);
    const offRows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.feedEventId, a.feedEventId));
    expect(offRows.map((r) => r.recipientUserId)).toEqual([COLLAB_ID]); // no noise row

    await patchNotificationPrefs(OUTSIDER_ID, { event: { key: "project-shipped", on: true } });
    const b = await shipACollabTicket("audience-on");
    await notifyShipForFeedEvent(b.feedEventId);
    const onRows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.feedEventId, b.feedEventId));
    expect(onRows.map((r) => r.recipientUserId).sort()).toEqual([COLLAB_ID, OUTSIDER_ID].sort());
    await db.delete(projectMembers).where(eq(projectMembers.userId, OUTSIDER_ID));
  });
});

describe("weekly digest (force mode — the acceptance affordance)", () => {
  it("composes per-Collaborator over THEIR projects; period key makes reruns no-ops", async () => {
    const first = await composeDigests(new Date(), { force: true });
    expect(first.composed).toBeGreaterThanOrEqual(1);
    const again = await composeDigests(new Date(), { force: true });
    expect(again.composed).toBe(0); // same forced period key

    const rows = await db
      .select()
      .from(notificationOutbox)
      .where(
        sql`${notificationOutbox.recipientUserId} = ${COLLAB_ID} and ${notificationOutbox.kind} = 'digest'`,
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].periodKey).toMatch(/-forced$/);
    expect(rows[0].subject).toMatch(/shipped/);
    expect(rows[0].text).toContain("WHAT SHIPPED");
    // their digest covers THEIR project only — the secret project's name never appears
    expect(rows[0].html ?? "").not.toContain(`${MARK} secret`);
  });

  it("a Collaborator with no roster rows is not a digest audience", async () => {
    const outsiderRows = await db
      .select()
      .from(notificationOutbox)
      .where(
        sql`${notificationOutbox.recipientUserId} = ${OUTSIDER_ID} and ${notificationOutbox.kind} = 'digest'`,
      );
    expect(outsiderRows).toHaveLength(0);
  });
});

describe("the reply mutation (PRD #47 — THE OUTBOX RULE)", () => {
  it("one statement: replied feed row + ticket last-touch bump", async () => {
    const filed = await fileTicket({
      projectId,
      title: `${MARK} reply target`,
      body: "story",
      kind: null,
      priority: "whenever",
      reporter: COLLAB_EMAIL,
      reporterUserId: COLLAB_ID,
    });
    if (!filed.ok) throw new Error("fileTicket failed");
    const before = await db.select().from(tickets).where(eq(tickets.id, filed.id));

    const reply = await replyOnTicket({
      ticketId: filed.id,
      actor: COLLAB_EMAIL,
      text: "Here's the screenshot you asked for.",
    });
    expect(reply.ok).toBe(true);

    const feed = await db
      .select()
      .from(feedEvents)
      .where(sql`${feedEvents.ticketId} = ${filed.id} and ${feedEvents.kind} = 'replied'`);
    expect(feed).toHaveLength(1);
    expect(feed[0].preview).toBe("Here's the screenshot you asked for.");
    expect(feed[0].actor).toBe(COLLAB_EMAIL);

    const after = await db.select().from(tickets).where(eq(tickets.id, filed.id));
    expect(after[0].updatedAt.getTime()).toBeGreaterThanOrEqual(before[0].updatedAt.getTime());

    // degenerate inputs lose cleanly
    expect(await replyOnTicket({ ticketId: filed.id, actor: COLLAB_EMAIL, text: "   " })).toEqual({
      ok: false,
      reason: "empty-reply",
    });
    expect(
      await replyOnTicket({
        ticketId: "00000000-0000-0000-0000-000000000000",
        actor: COLLAB_EMAIL,
        text: "hello",
      }),
    ).toEqual({ ok: false, reason: "unknown-ticket" });
  });
});

describe("THE GUARD on every collab read (done criterion 2)", () => {
  it("collabTickets / collabFeedEvents / collabTicketByRef are roster-scoped", async () => {
    // a ticket on the secret project, visible to nobody on it
    const secret = await fileTicket({
      projectId: otherProjectId,
      title: `${MARK} secret ticket`,
      body: "",
      kind: null,
      priority: "whenever",
      reporter: "you",
    });
    if (!secret.ok) throw new Error("fileTicket failed");

    const mine = await collabTickets(COLLAB_ID, COLLAB_EMAIL);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((t) => t.projectId === projectId)).toBe(true);

    const feed = await collabFeedEvents(COLLAB_ID);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.every((e) => e.projectId === projectId)).toBe(true);

    // off-roster ref resolves to NULL — the page 404s, no oracle
    expect(await collabTicketByRef(secret.ref, COLLAB_ID)).toBeNull();
    // an unrostered user sees nothing at all
    expect(await collabTickets(OUTSIDER_ID, OUTSIDER_EMAIL)).toHaveLength(0);
    expect(await collabFeedEvents(OUTSIDER_ID)).toHaveLength(0);
    expect(await collabUnreadCount(OUTSIDER_ID)).toBe(0);
  });
});

describe("per-user read marks (the high-water design)", () => {
  it("mark-all-read is monotonic and scoped to the one user", async () => {
    expect(await readMarkFor(COLLAB_ID)).toBe(0);
    const unreadBefore = await collabUnreadCount(COLLAB_ID);
    expect(unreadBefore).toBeGreaterThan(0);

    await markAllReadFor(COLLAB_ID, 500);
    expect(await readMarkFor(COLLAB_ID)).toBe(500);
    // a stale tab racing backwards never regresses the mark (GREATEST)
    await markAllReadFor(COLLAB_ID, 100);
    expect(await readMarkFor(COLLAB_ID)).toBe(500);
    await markAllReadFor(COLLAB_ID, 9_999_999_999);
    expect(await collabUnreadCount(COLLAB_ID)).toBe(0);
    // the other user's mark is untouched
    expect(await readMarkFor(OUTSIDER_ID)).toBe(0);
  });
});

describe("outbox tally (the prefs-page rail numbers)", () => {
  it("counts this recipient's rows by status family", async () => {
    const tally = await outboxTally(COLLAB_ID);
    expect(tally.sent).toBe(0); // nothing ever sends in tests
    expect(tally.composed).toBeGreaterThanOrEqual(1);
    expect(tally.skipped).toBeGreaterThanOrEqual(1); // the frequency-off audit row
  });
});
