/**
 * M6 — Projects (minimal vertical slice for the cockpit).
 * M7 — first-class Projects (PRD #29–32): slug routes, repo identity,
 * honest Ingest lifecycle, and the Engine-written Ingest Summary shape.
 *
 * Today's pinned strip + "Other projects" rail (E:180–244, E:449–478)
 * read these rows; pin/unpin curation + the full Project surface are
 * M7's (src/domain/project/). `seeded` marks demo provenance — every
 * seed row carries it so honest data and demo data are always
 * distinguishable.
 *
 * Ingest honesty (M7 charter): `ingest_status` is none|queued|ready —
 * nothing can RUN an ingest until M9 (Engine & Runs), so M7 only ever
 * writes none/queued; `ready` + `ingest_summary` arrive when the Engine
 * does. The summary's typed shape lives in
 * src/domain/project/ingest-summary.ts (J's sections).
 */
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** M7 — honest ingest lifecycle (charter §1; the Engine writes `ready` at M9). */
export const ingestStatus = pgEnum("ingest_status", ["none", "queued", "ready"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** display name — "acme-website" (E:198). */
    name: text("name").notNull(),
    /** M7 — route key (/projects/[slug]); derived in src/domain/project/slug.ts. */
    slug: text("slug").notNull(),
    /** M7 — one-line description (O:96's hero sentence); Engine may write it at ingest. */
    description: text("description"),
    /** M7 — where the code lives: a remote URL (R:100's input)… */
    repoUrl: text("repo_url"),
    /** M7 — …or a path on the Owner's machine (the Bridge's territory, M9/M10). */
    localPath: text("local_path"),
    /** M7 — honest ingest state; see enum note above. */
    ingestStatus: ingestStatus("ingest_status").notNull().default("none"),
    /** M7 — when the Engine last finished reading the repo (J:120 "refreshed"). */
    ingestedAt: timestamp("ingested_at", { withTimezone: true }),
    /** M7 — the Engine-written Ingest Summary (J's sections); shape in domain. */
    ingestSummary: jsonb("ingest_summary"),
    /** Today's pinned strip renders only pinned projects (E:9, PRD #10). */
    pinned: boolean("pinned").notNull().default(false),
    /** seed provenance (M6 charter §1) — demo rows are marked, never silent. */
    seeded: boolean("seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("projects_slug_unique").on(t.slug)],
);

export type Project = typeof projects.$inferSelect;
export type IngestStatus = Project["ingestStatus"];
