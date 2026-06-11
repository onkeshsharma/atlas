/**
 * M5 — Auth & membership tables (charter §2).
 *
 * Identity itself lives in Neon Auth's managed `neon_auth` schema
 * (`neon_auth.user` etc. — owned by the hosted Better Auth server; the
 * v1-era `users_sync` table name is gone); these tables carry
 * what Atlas adds on top: the role vocabulary (Owner / Collaborator —
 * CONTEXT.md) and invite magic links (PRD #37, #46).
 */
import { sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";

/** CONTEXT.md role vocabulary — exactly one Owner per instance (PRD). */
export const membershipRole = pgEnum("membership_role", ["owner", "collaborator"]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Neon Auth user id (neon_auth.user.id — text, managed schema). */
    userId: text("user_id").notNull(),
    role: membershipRole("role").notNull(),
    /** What Collaborators see (DD:51); editable in onboarding step 03 (SS). */
    displayName: text("display_name").notNull(),
    /** @-mention handle (SS:186). */
    handle: text("handle"),
    /** single letter for the sidebar mark (SS:193); derived from displayName when null. */
    initial: text("initial"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("memberships_user_id_unique").on(t.userId),
    // PRD: "schema may allow multi, product won't" — we go one stronger:
    // a partial unique index makes the single-Owner invariant atomic at
    // the DB, closing the concurrent-sign-up race for free.
    uniqueIndex("memberships_one_owner").on(t.role).where(sql`${t.role} = 'owner'`),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** opaque magic-link token (`inv_` + 32 bytes base64url). */
    token: text("token").notNull(),
    email: text("email").notNull(),
    /** greeting name on the invite page ("Hi, ada." — U:47). */
    invitedName: text("invited_name"),
    /** optional welcome note, rendered as the U:55 pull-quote (PRD #37). */
    welcomeNote: text("welcome_note"),
    role: membershipRole("role").notNull().default("collaborator"),
    /**
     * M11 (additive) — the project this invite opens. Invites stay
     * INSTANCE-level (M5 deviation 3 stands: acceptance grants the
     * memberships row); when set, acceptance ALSO lands a
     * project_members roster row for this project, and the accept page
     * restores U's "About this Project" section with the real row.
     * NULL = a bare instance invite (no roster grant).
     */
    projectId: uuid("project_id").references(() => projects.id),
    /** Neon Auth user id of the inviting Owner. */
    invitedBy: text("invited_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    /** Neon Auth user id created/attached on acceptance. */
    acceptedBy: text("accepted_by"),
    /** Owner-side revocation. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /** invitee-side "no thanks" (U:156). */
    declinedAt: timestamp("declined_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("invites_token_unique").on(t.token)],
);

export type Membership = typeof memberships.$inferSelect;
export type Invite = typeof invites.$inferSelect;
