/**
 * M5 — read-only peek into Neon Auth's managed identity table
 * (`neon_auth."user"`) for display data Atlas doesn't duplicate:
 * the inviter's email on the invite page (U:62–67). Never written to —
 * the hosted Better Auth server owns that schema.
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";

export type AuthUser = { id: string; email: string; name: string };

export async function authUserById(id: string): Promise<AuthUser | undefined> {
  // neon_auth."user".id is uuid — compare as text so a non-uuid id
  // (e.g. a seeded fixture) reads "not found" instead of a cast error.
  const rows = (await db.execute(
    sql`select id::text as id, email, name from neon_auth."user" where id::text = ${id} limit 1`,
  )) as unknown as { rows: AuthUser[] };
  return rows.rows?.[0];
}
