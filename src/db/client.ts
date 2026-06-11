/**
 * M5 — Drizzle client over Neon's SQL-over-HTTP driver.
 *
 * neon-http is stateless per query (the right shape for server actions /
 * RSC on Vercel) and deliberately has NO interactive transactions —
 * multi-step domain writes are designed as atomic conditional UPDATEs +
 * idempotent INSERTs instead (see src/domain/auth/invites.ts).
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — see .env.example");
}

export const db = drizzle(neon(process.env.DATABASE_URL), { schema });

export type Db = typeof db;
