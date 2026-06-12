/**
 * M13 — the Notifier consumer (charter item 3; ADR-0003).
 *
 * THE TRIGGER SEAM: ship notifications hook the existing feed outbox —
 * the `shipped` row IS the event (THE OUTBOX RULE means it can never be
 * missing when a ship happened). Two kick sites share this module:
 *
 *   1. in-path — the Bridge transition route calls
 *      `notifyShipForFeedEvent` right after `shipRun` lands (the common
 *      case: compose within the same request).
 *   2. catch-up — the cron route (app/api/notifier/cron) re-scans
 *      recent shipped rows lacking an outbox decision and composes them
 *      (a kick lost to a crash/redeploy is healed on the next pass —
 *      ADR-0002's "catch-up is DB state" idiom, anti-join form). The
 *      partial unique indexes make redelivery compose nothing twice.
 *
 * RECIPIENT RULINGS (recorded):
 *   - the REPORTER gets the ship email (PRD #28) — resolved by
 *     tickets.reporter_user_id, gated by `ticket-shipped`; their row
 *     always lands (sent / deferred / skipped-pref — the audit shows
 *     the decision) PROVIDED they are still a project_members row
 *     (member-removed = stop notifying, HANDOFF-M11; THE GUARD's
 *     project_members join is the scope — never re-derived).
 *   - other rostered Collaborators are an audience only when their
 *     `project-shipped` event is ON (default off) — no skipped-pref
 *     noise rows for the default-off majority.
 *   - the Owner never gets ship emails (they shipped it); seeded demo
 *     rows never compose (no fake claims to real inboxes).
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { parseRunDiffStats } from "@/src/domain/run/diff-stats";
import { notificationPrefs } from "@/src/domain/notifications/preferences";
import { timeAgo } from "@/src/lib/format";

import { composeDigestEmail, type DigestShipItem } from "./compose-digest";
import { composeShipEmail } from "./compose-ship";
import { emailConfigured, notifierFromBareAddress, sendEmail } from "./deliver";
import {
  digestWindow,
  digestWindowLabel,
  gateDigest,
  gateShipNotification,
  isDigestDue,
  periodKeyFor,
  quietDeferral,
  type GateDecision,
} from "./gate";
import {
  dueOutboxRows,
  insertOutboxRow,
  markOutboxFailed,
  markOutboxSent,
  pushOutboxDeliverAfter,
  unprocessedShippedEventIds,
  type OutboxInsert,
} from "./outbox";

function appUrl(): string | null {
  return process.env.ATLAS_APP_URL ?? null;
}

/** `in (…)` fragment — neon-http array params are not relied on. */
function inList(ids: string[]) {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}

function firstName(display: string | null, email: string): string {
  const name = display?.trim();
  if (name) return name.split(/\s+/)[0];
  return email.split("@")[0];
}

async function ownerIdentity(): Promise<{ name: string; email: string | null }> {
  const result = (await db.execute(sql`
    select m.display_name, u.email
    from memberships m
    left join neon_auth."user" u on u.id::text = m.user_id
    where m.role = 'owner'
    limit 1
  `)) as unknown as { rows: Array<{ display_name: string; email: string | null }> };
  const row = result.rows[0];
  return { name: row?.display_name ?? "the Owner", email: row?.email ?? null };
}

function statusFor(decision: GateDecision): Pick<OutboxInsert, "status" | "deliverAfter" | "error"> {
  switch (decision.action) {
    case "send":
      return { status: "composed", deliverAfter: null };
    case "defer-daily":
      return { status: "composed", deliverAfter: decision.deliverAfter };
    case "defer-quiet":
      return { status: "skipped-quiet-hours", deliverAfter: decision.deliverAfter };
    case "skip":
      return { status: "skipped-pref", error: decision.reason };
  }
}

// ── ship notifications ─────────────────────────────────────────────────

/**
 * Compose outbox rows for ONE `shipped` feed event. Idempotent — safe
 * from both kick sites, any number of times.
 */
export async function notifyShipForFeedEvent(
  feedEventId: number,
  now = new Date(),
): Promise<{ composed: number }> {
  const result = (await db.execute(sql`
    select
      fe.id as event_id,
      t.id as ticket_id, t.ref as ticket_ref, t.title as ticket_title,
      t.reporter_user_id, t.created_at as filed_at,
      p.id as project_id, p.name as project_name,
      r.diff_stats, r.pr_url
    from feed_events fe
    join tickets t on t.id = fe.ticket_id
    join projects p on p.id = t.project_id
    left join runs r on r.id = fe.run_id
    where fe.id = ${feedEventId} and fe.kind = 'shipped' and fe.seeded = false
  `)) as unknown as {
    rows: Array<{
      event_id: number | string;
      ticket_id: string;
      ticket_ref: string;
      ticket_title: string;
      reporter_user_id: string | null;
      filed_at: string | Date;
      project_id: string;
      project_name: string;
      diff_stats: unknown;
      pr_url: string | null;
    }>;
  };
  const event = result.rows[0];
  if (!event) return { composed: 0 };

  // the audience: rostered Collaborators of THIS project (two-table rule
  // via the project_members join — guard.ts's scope, never re-derived).
  const audience = (await db.execute(sql`
    select pm.user_id, m.display_name, u.email
    from project_members pm
    join memberships m on m.user_id = pm.user_id and m.role = 'collaborator'
    left join neon_auth."user" u on u.id::text = pm.user_id
    where pm.project_id = ${event.project_id}
  `)) as unknown as {
    rows: Array<{ user_id: string; display_name: string | null; email: string | null }>;
  };

  const owner = await ownerIdentity();
  const diff = parseRunDiffStats(event.diff_stats);
  let composed = 0;

  for (const person of audience.rows) {
    if (!person.email) continue; // no address, nothing to compose against
    const isReporter = person.user_id === event.reporter_user_id;
    const prefs = await notificationPrefs(person.user_id);
    // default-off non-reporter audience: no noise rows (header ruling)
    if (!isReporter && !prefs.events["project-shipped"]) continue;

    const decision = gateShipNotification(prefs, { now, isReporter });
    const email = composeShipEmail({
      recipientName: firstName(person.display_name, person.email),
      recipientEmail: person.email,
      ownerName: owner.name,
      projectName: event.project_name,
      ticketRef: event.ticket_ref,
      ticketTitle: event.ticket_title,
      filedAgo: timeAgo(new Date(event.filed_at)),
      prUrl: event.pr_url,
      diff,
      appUrl: appUrl(),
      replyToOwner: owner.email !== null,
      fromAddress: notifierFromBareAddress(),
    });
    const { inserted } = await insertOutboxRow({
      recipientUserId: person.user_id,
      recipientEmail: person.email,
      kind: "ship",
      subject: email.subject,
      html: prefs.emailFormat === "plain" ? null : email.html,
      text: email.text,
      feedEventId: Number(event.event_id),
      ticketId: event.ticket_id,
      projectId: event.project_id,
      emailFormat: prefs.emailFormat,
      ...statusFor(decision),
    });
    if (inserted) composed += 1;
  }
  return { composed };
}

/** catch-up: compose every recent shipped row without an outbox decision. */
export async function composeMissedShips(now = new Date()): Promise<{ composed: number }> {
  const ids = await unprocessedShippedEventIds();
  let composed = 0;
  for (const id of ids) {
    composed += (await notifyShipForFeedEvent(id, now)).composed;
  }
  return { composed };
}

// ── weekly digests ─────────────────────────────────────────────────────

/**
 * Compose the weekly digest per Collaborator (PRD #45). Organic runs
 * fire Monday ≥09:00 recipient-local over the last FULL UTC week;
 * `force` digests the trailing 7 days under a "-forced" period key (the
 * acceptance/test affordance — deliberate sends stay idempotent without
 * colliding with Monday's organic key). Quiet weeks (no ships, nothing
 * filed, nothing in review) compose nothing — a zero-everything email
 * is spam, not a digest.
 */
export async function composeDigests(
  now = new Date(),
  opts: { force?: boolean } = {},
): Promise<{ composed: number }> {
  const window = opts.force
    ? { start: new Date(now.getTime() - 7 * 86_400_000), end: now }
    : digestWindow(now);
  const periodKey = opts.force ? `${periodKeyFor(now)}-forced` : periodKeyFor(window.start);

  const collaborators = (await db.execute(sql`
    select m.user_id, m.display_name, u.email
    from memberships m
    left join neon_auth."user" u on u.id::text = m.user_id
    where m.role = 'collaborator'
  `)) as unknown as {
    rows: Array<{ user_id: string; display_name: string | null; email: string | null }>;
  };
  if (!collaborators.rows.length) return { composed: 0 };

  const owner = await ownerIdentity();
  let composed = 0;

  for (const person of collaborators.rows) {
    if (!person.email) continue;
    const prefs = await notificationPrefs(person.user_id);
    if (!opts.force && !isDigestDue(now, prefs.timezone)) continue;

    // THE GUARD's scope: their rostered projects only (visibleProjectIds shape).
    const projects = (await db.execute(sql`
      select p.id, p.name from project_members pm
      join projects p on p.id = pm.project_id
      where pm.user_id = ${person.user_id}
      order by pm.added_at asc
    `)) as unknown as { rows: Array<{ id: string; name: string }> };
    if (!projects.rows.length) continue; // not a digest audience
    const projectIds = projects.rows.map((p) => p.id);

    const ships = (await db.execute(sql`
      select t.ref, t.title, t.body, t.reporter_user_id,
             r.diff_stats, r.pr_url, fe.created_at as shipped_at
      from feed_events fe
      join tickets t on t.id = fe.ticket_id
      left join runs r on r.id = fe.run_id
      where fe.kind = 'shipped' and fe.seeded = false
        and fe.project_id in (${inList(projectIds)})
        and fe.created_at >= ${window.start} and fe.created_at < ${window.end}
      order by fe.created_at desc
    `)) as unknown as {
      rows: Array<{
        ref: string;
        title: string;
        body: string;
        reporter_user_id: string | null;
        diff_stats: unknown;
        pr_url: string | null;
        shipped_at: string | Date;
      }>;
    };

    const [openedRow] = (
      (await db.execute(sql`
        select count(*)::int as n from tickets
        where seeded = false and project_id in (${inList(projectIds)})
          and created_at >= ${window.start} and created_at < ${window.end}
      `)) as unknown as { rows: Array<{ n: number }> }
    ).rows;

    const inReview = (await db.execute(sql`
      select ref, title from tickets
      where seeded = false and state = 'review-ready'
        and project_id in (${inList(projectIds)})
      order by updated_at desc limit 5
    `)) as unknown as { rows: Array<{ ref: string; title: string }> };

    const opened = openedRow?.n ?? 0;
    if (!ships.rows.length && opened === 0 && !inReview.rows.length) continue; // quiet week

    const items: DigestShipItem[] = ships.rows.map((s) => {
      const diff = parseRunDiffStats(s.diff_stats);
      const story = s.body?.trim().split(/\n+/)[0] ?? "";
      const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(
        new Date(s.shipped_at),
      );
      return {
        ticketRef: s.ref,
        title: s.title,
        body: story
          ? story.length > 160
            ? `${story.slice(0, 157)}…`
            : story
          : diff
            ? `${diff.filesChanged} file${diff.filesChanged === 1 ? "" : "s"} changed (+${diff.insertions} −${diff.deletions}) — open Atlas for the full story.`
            : "Shipped from the Owner's review — open Atlas for the full story.",
        meta: `Ticket ${s.ref} · shipped ${day}${s.pr_url ? ` · PR ↗` : ""}`,
        fromYou: s.reporter_user_id !== null && s.reporter_user_id === person.user_id,
      };
    });

    const decision = gateDigest(prefs, { now });
    const email = composeDigestEmail({
      recipientName: firstName(person.display_name, person.email),
      recipientEmail: person.email,
      ownerName: owner.name,
      projectNames: projects.rows.map((p) => p.name),
      windowLabel: digestWindowLabel(window),
      ships: items,
      openedCount: opened,
      inReview: inReview.rows.map((r) => ({ ticketRef: r.ref, title: r.title })),
      appUrl: appUrl(),
      fromAddress: notifierFromBareAddress(),
    });
    const { inserted } = await insertOutboxRow({
      recipientUserId: person.user_id,
      recipientEmail: person.email,
      kind: "digest",
      subject: email.subject,
      html: prefs.emailFormat === "plain" ? null : email.html,
      text: email.text,
      periodKey,
      projectId: projects.rows.length === 1 ? projects.rows[0].id : null,
      emailFormat: prefs.emailFormat,
      ...statusFor(decision),
    });
    if (inserted) composed += 1;
  }
  return { composed };
}

// ── delivery pass ──────────────────────────────────────────────────────

/**
 * Send every due row — only when a key exists. Quiet hours are
 * re-checked at send time (a daily-batch edge can land inside a quiet
 * window); rows hitting the window are pushed to its edge instead.
 */
export async function deliverDue(now = new Date()): Promise<{ delivered: number; failed: number }> {
  if (!emailConfigured()) return { delivered: 0, failed: 0 };
  const due = await dueOutboxRows(now);
  if (!due.length) return { delivered: 0, failed: 0 };

  const owner = await ownerIdentity();
  let delivered = 0;
  let failed = 0;
  for (const row of due) {
    const prefs = await notificationPrefs(row.recipientUserId);
    const quietUntil = quietDeferral(now, prefs);
    if (quietUntil) {
      await pushOutboxDeliverAfter(row.id, quietUntil);
      continue;
    }
    const result = await sendEmail({
      to: row.recipientEmail,
      subject: row.subject,
      html: row.html,
      text: row.text,
      replyTo: row.kind === "ship" ? owner.email : null,
    });
    if (result.ok) {
      await markOutboxSent(row.id, result.providerId);
      delivered += 1;
    } else {
      await markOutboxFailed(row.id, result.error);
      failed += 1;
    }
  }
  return { delivered, failed };
}

/** the cron pass: catch-up composes + digests + delivery (ADR-0003). */
export async function processNotifier(
  now = new Date(),
  opts: { forceDigest?: boolean } = {},
): Promise<{ ships: number; digests: number; delivered: number; failed: number }> {
  const ships = await composeMissedShips(now);
  const digests = await composeDigests(now, { force: opts.forceDigest });
  const delivery = await deliverDue(now);
  return { ships: ships.composed, digests: digests.composed, ...delivery };
}
