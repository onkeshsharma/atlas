/**
 * M11 — audit-log source fetchers (charter item 5). Three real sources,
 * composed in memory (instance-scale data; the cap below is generous
 * and the page says how much it shows):
 *
 *   feed_events (ALL kinds) · neon_auth.session (sign-ins, read-only
 *   peek — the M5 users.ts precedent) · api_tokens (derived CRUD).
 *
 * Composition/filtering/grouping are pure — src/domain/audit/events.ts.
 */
import { desc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { apiTokens, feedEvents, projects } from "@/src/db/schema";
import { sql } from "drizzle-orm";

import { describeUserAgent } from "../auth/account";
import { KIND_CONNECTOR, KIND_WORD } from "../feed/kinds";
import { parseScopes } from "../tokens/api-tokens";
import {
  feedRowToAudit,
  sessionRowToAudit,
  sortAuditEvents,
  tokenToAuditEvents,
  type AuditEvent,
} from "./events";

/** generous instance-scale cap; the page footer names it when reached. */
export const AUDIT_FEED_CAP = 1000;

async function feedAuditEvents(): Promise<AuditEvent[]> {
  const rows = await db
    .select({ event: feedEvents, projectName: projects.name })
    .from(feedEvents)
    .leftJoin(projects, eq(feedEvents.projectId, projects.id))
    .orderBy(desc(feedEvents.createdAt), desc(feedEvents.id))
    .limit(AUDIT_FEED_CAP);
  return rows.map((r) =>
    feedRowToAudit(
      {
        id: r.event.id,
        kind: r.event.kind,
        actor: r.event.actor,
        summary: r.event.summary,
        preview: r.event.preview,
        ticketRef: r.event.ticketRef,
        projectName: r.projectName,
        createdAt: r.event.createdAt,
      },
      KIND_WORD[r.event.kind],
      KIND_CONNECTOR[r.event.kind],
    ),
  );
}

/**
 * Sign-ins from the live Neon Auth session record. Sessions age out
 * with their expiry — the page's honesty note says so; Atlas never
 * fabricates a longer history than the table holds.
 */
async function sessionAuditEvents(): Promise<AuditEvent[]> {
  const result = (await db.execute(sql`
    select
      s.id::text as id,
      s."createdAt" as created_at,
      s."ipAddress" as ip_address,
      s."userAgent" as user_agent,
      coalesce(m.display_name, u.name, u.email, 'someone') as actor
    from neon_auth.session s
    left join neon_auth."user" u on u.id = s."userId"
    left join memberships m on m.user_id = s."userId"::text
    order by s."createdAt" desc
  `)) as unknown as {
    rows: Array<{
      id: string;
      created_at: string | Date;
      ip_address: string | null;
      user_agent: string | null;
      actor: string;
    }>;
  };
  return result.rows.map((r) =>
    sessionRowToAudit({
      id: r.id,
      createdAt: new Date(r.created_at),
      ipAddress: r.ip_address,
      client: describeUserAgent(r.user_agent),
      actor: r.actor,
    }),
  );
}

async function tokenAuditEvents(): Promise<AuditEvent[]> {
  const rows = await db.select().from(apiTokens);
  return rows.flatMap((t) =>
    tokenToAuditEvents({
      id: t.id,
      name: t.name,
      prefix: t.prefix,
      scopes: parseScopes(t.scopes),
      createdAt: t.createdAt,
      revokedAt: t.revokedAt,
    }),
  );
}

/** the whole record, newest first — filter/group with events.ts helpers. */
export async function allAuditEvents(): Promise<AuditEvent[]> {
  const [feed, sessions, tokens] = await Promise.all([
    feedAuditEvents(),
    sessionAuditEvents(),
    tokenAuditEvents(),
  ]);
  return sortAuditEvents([...feed, ...sessions, ...tokens]);
}

/** when the record begins — the honest replacement for TT's "retained 7 years". */
export async function recordBeginsAt(): Promise<Date | null> {
  const result = (await db.execute(sql`
    select min(created_at) as first_at from feed_events
  `)) as unknown as { rows: Array<{ first_at: string | Date | null }> };
  const first = result.rows[0]?.first_at;
  return first ? new Date(first) : null;
}
