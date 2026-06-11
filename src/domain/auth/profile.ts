/**
 * M10 — profile writes (QQ; charter item 8): the Owner's identity
 * fields. Atlas-owned fields (display name / initial / handle) live on
 * `memberships` (M5's design — identity itself is Neon Auth's); the
 * display name ALSO pushes to the Neon Auth user record best-effort via
 * updateUser so sign-in greetings agree. §2.13 validation server-side —
 * the page renders the messages in the canon error shape.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

import { auth } from "./server";

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
  await db.execute(sql`
    update memberships set display_name = ${v.value} where user_id = ${userId}
  `);
  // best-effort mirror into the Neon Auth profile name (sign-up's "Your name")
  try {
    await auth.updateUser({ name: v.value });
  } catch {
    // the membership row is the Atlas truth; the mirror is a nicety.
  }
  return { ok: true };
}

export async function updateInitial(userId: string, raw: string): Promise<FieldResult> {
  const v = validateInitial(raw);
  if (v.message) return { ok: false, message: v.message };
  await db.execute(sql`
    update memberships set initial = ${v.value} where user_id = ${userId}
  `);
  return { ok: true };
}

export async function updateHandle(userId: string, raw: string): Promise<FieldResult> {
  const v = validateHandle(raw);
  if (v.message) return { ok: false, message: v.message };
  await db.execute(sql`
    update memberships set handle = ${v.value} where user_id = ${userId}
  `);
  return { ok: true };
}
