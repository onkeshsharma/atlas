/**
 * M6 — Run read models for the cockpit (Today's active strip + the
 * §3.3 Needs Input panel). M7/M8/M9 reuse these; extend here, never
 * inline SQL in pages.
 */
import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db/client";
import { projects, runs, tickets } from "@/src/db/schema";

import { parseNeedsInputQuestion, type NeedsInputQuestion } from "./needs-input";
import { ACTIVE_STATES, type RunState } from "./states";

export type ActiveRunRow = {
  id: string;
  ref: string;
  title: string;
  state: RunState;
  projectName: string;
  ticketRef: string | null;
  /** when the run entered its current state. */
  since: Date;
};

/** queued + running + needs-input, oldest first (queue order). */
export async function activeRuns(): Promise<ActiveRunRow[]> {
  const rows = await db
    .select({
      id: runs.id,
      ref: runs.ref,
      title: runs.title,
      state: runs.state,
      projectName: projects.name,
      ticketRef: tickets.ref,
      since: runs.updatedAt,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .leftJoin(tickets, eq(runs.ticketId, tickets.id))
    .where(inArray(runs.state, [...ACTIVE_STATES]))
    .orderBy(asc(runs.createdAt));
  return rows;
}

export type NeedsInputRow = {
  id: string;
  ref: string;
  title: string;
  projectName: string;
  question: NeedsInputQuestion;
  since: Date;
};

/** the §3.3 panel rows — every needs-input Run with a valid question payload. */
export async function needsInputRuns(): Promise<NeedsInputRow[]> {
  const rows = await db
    .select({
      id: runs.id,
      ref: runs.ref,
      title: runs.title,
      projectName: projects.name,
      question: runs.question,
      since: runs.updatedAt,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .where(eq(runs.state, "needs-input"))
    .orderBy(desc(runs.updatedAt));
  return rows.flatMap((r) => {
    const question = parseNeedsInputQuestion(r.question);
    return question ? [{ ...r, question }] : [];
  });
}
