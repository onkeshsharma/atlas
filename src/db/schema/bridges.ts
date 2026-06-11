/**
 * M9 — Bridges: the Owner's local orchestrator daemons (ADR-0001,
 * ADR-0002). Minimal by charter — M10 builds the management UI
 * (pairing flow, doctor, capability cards); M9 needs exactly enough to
 * authenticate the daemon and render honest liveness.
 *
 * The daemon authenticates with a bearer token (env `ATLAS_BRIDGE_TOKEN`);
 * Atlas stores only the sha-256 hash (docs/adr/0002-bridge-transport.md).
 * Pairing in M9 is `scripts/pair-bridge.mjs` (prints the token once) —
 * the XX show-once panel arrives with M10.
 */
import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const bridges = pgTable("bridges", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** display name — the Owner's machine ("onkesh-desktop"). */
  name: text("name").notNull(),
  /** sha-256 hex of the bearer token; the plaintext is never stored. */
  tokenHash: text("token_hash").notNull(),
  /**
   * what the daemon reported it can actually do (heartbeat body):
   * { version, engine: "real"|"fake", maxParallel?, git?, gh? } —
   * M10's "what the daemon can actually do" surface reads this.
   */
  capabilities: jsonb("capabilities"),
  /** last heartbeat — sidebar BridgeStatus derives healthy/offline from it. */
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  // ── M10 (migration 0006) — doctor + revocation ──
  /**
   * last BridgeDoctorResult the daemon posted (PRD #34) — typed +
   * validated in src/domain/bridge/doctor.ts. jsonb on the row per
   * charter item 1 (one doctor verdict per bridge; history is not the
   * point — the checks are).
   */
  doctor: jsonb("doctor"),
  /**
   * pending doctor request marker (the ship_requested_at idiom): set by
   * the UI's single-statement writer whose outbox row IS the daemon's
   * `bridge-doctor` command; cleared when the result posts back.
   */
  doctorRequestedAt: timestamp("doctor_requested_at", { withTimezone: true }),
  /**
   * revocation is a mark, not a delete — runs keep their bridge_id FK.
   * A revoked bridge fails token auth (401 → the daemon stops, ADR-0002
   * §1); re-pairing the same name clears it.
   */
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  seeded: boolean("seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Bridge = typeof bridges.$inferSelect;
