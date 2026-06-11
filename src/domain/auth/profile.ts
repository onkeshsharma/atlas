/**
 * M10 — profile writes (QQ; charter item 8): the Owner's identity
 * fields. Atlas-owned fields (display name / initial / handle) live on
 * `memberships` (M5's design — identity itself is Neon Auth's); the
 * display name ALSO pushes to the Neon Auth user record best-effort via
 * updateUser so sign-in greetings agree. §2.13 validation server-side —
 * the page renders the messages in the canon error shape.
 *
 * M11 (sanctioned surgical edit — charter item 6, M10's closing note):
 * each field UPDATE now lands its `profile-changed` feed row in the
 * SAME statement (THE OUTBOX RULE), and only when the value actually
 * changed (`is distinct from` gate) — a no-op save writes no history.
 */
import { sql, type SQL } from "drizzle-orm";

import { db } from "@/src/db/client";

/** one statement: gated field UPDATE + `profile-changed` outbox row (M11). */
async function updateProfileField(
  userId: string,
  field: "display_name" | "initial" | "handle",
  value: string | null,
  label: string,
): Promise<void> {
  const fieldIdent: SQL = sql.raw(`"${field}"`);
  // ::text casts — the same nullable param appears in several positions,
  // which defeats PG's type inference over the neon-http wire.
  await db.execute(sql`
    with changed as (
      update memberships
      set ${fieldIdent} = ${value}::text
      where user_id = ${userId} and ${fieldIdent} is distinct from ${value}::text
      returning display_name
    )
    insert into feed_events (kind, actor, summary, payload, seeded)
    select
      'profile-changed',
      changed.display_name,
      ${label}::text || coalesce(' — now "' || ${value}::text || '"', ' cleared'),
      jsonb_build_object('field', ${field}::text, 'userId', ${userId}::text),
      false
    from changed
  `);
}

export type FieldResult = { ok: true } | { ok: false; message: string };

export function validateDisplayName(raw: string): { value?: string; message?: string } {
  const value = raw.trim();
  if (value.length === 0) return { message: "a name is required" };
  if (value.length > 60) return { message: "keep it under 60 characters" };
  return { value };
}

export function validateInitial(raw: string): { value?: string | null; message?: string } {
  const value = raw.trim();
  if (value.length === 0) return { value: null }; // derive from name
  if (!/^[a-zA-Z]$/.test(value)) return { message: "one letter — it is a typographic mark" };
  return { value: value.toLowerCase() };
}

export function validateHandle(raw: string): { value?: string | null; message?: string } {
  const value = raw.trim().replace(/^@/, "");
  if (value.length === 0) return { value: null };
  if (!/^[a-z0-9][a-z0-9-]{1,23}$/.test(value)) {
    return { message: "2–24 chars · lowercase letters, digits, dashes" };
  }
  return { value };
}

export async function updateDisplayName(userId: string, raw: string): Promise<FieldResult> {
  const v = validateDisplayName(raw);
  if (v.message) return { ok: false, message: v.message };
  await updateProfileField(userId, "display_name", v.value!, "display name");
  // best-effort mirror into the Neon Auth profile name (sign-up's "Your name").
  // Lazy import: ./server pulls next/headers, which vitest's node env
  // doesn't ship — the mirror is a nicety, the membership row is the truth (M11).
  try {
    const { auth } = await import("./server");
    await auth.updateUser({ name: v.value });
  } catch {
    // the membership row is the Atlas truth; the mirror is a nicety.
  }
  return { ok: true };
}

export async function updateInitial(userId: string, raw: string): Promise<FieldResult> {
  const v = validateInitial(raw);
  if (v.message) return { ok: false, message: v.message };
  await updateProfileField(userId, "initial", v.value ?? null, "initial");
  return { ok: true };
}

export async function updateHandle(userId: string, raw: string): Promise<FieldResult> {
  const v = validateHandle(raw);
  if (v.message) return { ok: false, message: v.message };
  await updateProfileField(userId, "handle", v.value ?? null, "handle");
  return { ok: true };
}
