/**
 * M10 — notification preferences (CC; charter item 7). The STORAGE half
 * of PRD #48: rows the Notifier (M13) reads when it ships. Delivery
 * truth today — the in-app inbox delivers now; email does not — lives
 * in the page copy, never contradicted here.
 *
 * Event vocabulary mirrors CC's groups, owner-true: each key toggles
 * one kind of future notification independently.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { notificationPreferences } from "@/src/db/schema";

export const FREQUENCIES = ["instant", "daily", "weekly", "off"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const EMAIL_FORMATS = ["editorial", "plain"] as const;
export type EmailFormat = (typeof EMAIL_FORMATS)[number];

/** CC "What you care about" — groups + per-event keys with display copy. */
export const EVENT_GROUPS: Array<{
  group: string;
  events: Array<{ key: string; label: string; sub: string; defaultOn: boolean }>;
}> = [
  {
    group: "Tickets you filed",
    events: [
      { key: "ticket-shipped", label: "Shipped", sub: "the Engine completed and merged", defaultOn: true },
      { key: "ticket-replied", label: "Someone replied", sub: "a Collaborator asked you something or added a note", defaultOn: true },
      { key: "ticket-declined", label: "Declined", sub: "marked “won’t fix” in triage", defaultOn: true },
      { key: "ticket-moved", label: "State changed", sub: "moved between Triage / Backlog / Active / Review", defaultOn: false },
    ],
  },
  {
    group: "Project-wide",
    events: [
      { key: "project-shipped", label: "Something shipped", sub: "any Ticket you didn’t file", defaultOn: false },
      { key: "collaborator-joined", label: "New Collaborator joined", sub: "someone accepted an invite", defaultOn: false },
      { key: "triage-backlog", label: "Triage queue ≥ 5", sub: "Owner-only · helps you keep up", defaultOn: true },
    ],
  },
];

export const EVENT_KEYS = EVENT_GROUPS.flatMap((g) => g.events.map((e) => e.key));

export type NotificationPrefsView = {
  emailEnabled: boolean;
  frequency: Frequency;
  /** key → on; defaults applied for keys never written. */
  events: Record<string, boolean>;
  quietFrom: string | null;
  quietUntil: string | null;
  timezone: string | null;
  emailFormat: EmailFormat;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidQuietTime(value: string): boolean {
  return HHMM.test(value);
}

export function defaultEvents(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const g of EVENT_GROUPS) for (const e of g.events) out[e.key] = e.defaultOn;
  return out;
}

function parseEvents(value: unknown): Record<string, boolean> {
  const out = defaultEvents();
  if (typeof value !== "object" || value === null || Array.isArray(value)) return out;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k in out && typeof v === "boolean") out[k] = v;
  }
  return out;
}

export async function notificationPrefs(userId: string): Promise<NotificationPrefsView> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(sql`${notificationPreferences.userId} = ${userId}`)
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      emailEnabled: true,
      frequency: "instant",
      events: defaultEvents(),
      quietFrom: null,
      quietUntil: null,
      timezone: null,
      emailFormat: "editorial",
    };
  }
  return {
    emailEnabled: row.emailEnabled,
    frequency: (FREQUENCIES as readonly string[]).includes(row.frequency)
      ? (row.frequency as Frequency)
      : "instant",
    events: parseEvents(row.events),
    quietFrom: row.quietFrom,
    quietUntil: row.quietUntil,
    timezone: row.timezone,
    emailFormat: (EMAIL_FORMATS as readonly string[]).includes(row.emailFormat)
      ? (row.emailFormat as EmailFormat)
      : "editorial",
  };
}

export type PrefsPatch = Partial<{
  emailEnabled: boolean;
  frequency: Frequency;
  /** single event flip — merged into the stored map. */
  event: { key: string; on: boolean };
  quietFrom: string | null;
  quietUntil: string | null;
  timezone: string | null;
  emailFormat: EmailFormat;
}>;

export type PatchResult = { ok: true } | { ok: false; message: string };

/**
 * Validate + upsert one preference change (CC's controls save as they
 * change — H:242's "Atlas saves as you go"). Single-statement upsert on
 * the user-id PK; the events map merges at the DB so concurrent flips
 * of different keys both land.
 */
export async function patchNotificationPrefs(
  userId: string,
  patch: PrefsPatch,
): Promise<PatchResult> {
  if (patch.frequency !== undefined && !FREQUENCIES.includes(patch.frequency)) {
    return { ok: false, message: "unknown frequency" };
  }
  if (patch.emailFormat !== undefined && !EMAIL_FORMATS.includes(patch.emailFormat)) {
    return { ok: false, message: "unknown email format" };
  }
  if (patch.event !== undefined && !EVENT_KEYS.includes(patch.event.key)) {
    return { ok: false, message: "unknown event kind" };
  }
  for (const side of ["quietFrom", "quietUntil"] as const) {
    const v = patch[side];
    if (v !== undefined && v !== null && !isValidQuietTime(v)) {
      return { ok: false, message: "times are 24-hour HH:MM" };
    }
  }
  if (patch.timezone !== undefined && patch.timezone !== null && patch.timezone.length > 64) {
    return { ok: false, message: "timezone looks wrong" };
  }

  const eventsMerge = patch.event
    ? JSON.stringify({ [patch.event.key]: patch.event.on })
    : null;

  // seed inserts get the full default map so later merges have a base.
  const insertEvents = JSON.stringify(
    patch.event ? { ...defaultEvents(), [patch.event.key]: patch.event.on } : defaultEvents(),
  );

  await db.execute(sql`
    insert into notification_preferences
      (user_id, email_enabled, frequency, events, quiet_from, quiet_until, timezone, email_format, updated_at)
    values (
      ${userId},
      ${patch.emailEnabled ?? true},
      ${patch.frequency ?? "instant"},
      ${insertEvents}::jsonb,
      ${patch.quietFrom ?? null},
      ${patch.quietUntil ?? null},
      ${patch.timezone ?? null},
      ${patch.emailFormat ?? "editorial"},
      now()
    )
    on conflict (user_id) do update set
      email_enabled = coalesce(${patch.emailEnabled ?? null}, notification_preferences.email_enabled),
      frequency = coalesce(${patch.frequency ?? null}, notification_preferences.frequency),
      events = notification_preferences.events || coalesce(${eventsMerge}::jsonb, '{}'::jsonb),
      quiet_from = case when ${patch.quietFrom !== undefined} then ${patch.quietFrom ?? null} else notification_preferences.quiet_from end,
      quiet_until = case when ${patch.quietUntil !== undefined} then ${patch.quietUntil ?? null} else notification_preferences.quiet_until end,
      timezone = case when ${patch.timezone !== undefined} then ${patch.timezone ?? null} else notification_preferences.timezone end,
      email_format = coalesce(${patch.emailFormat ?? null}, notification_preferences.email_format),
      updated_at = now()
  `);
  return { ok: true };
}
