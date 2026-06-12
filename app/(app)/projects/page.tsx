/**
 * M7 — /projects index. NO variant exists for a project index — the
 * charter sanctions exactly this: a minimal canon-composed DividedList
 * page (§2.2 routed header + §2.3 rows), nothing invented beyond those
 * recipes. Rows reuse M6's cockpit projectRows() (charter §2); the ★
 * pinned mark is E:209's iconography carried by the same rows on Today.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  DividedList,
  EmptyState,
  ListRow,
  PageHeader,
  PillButton,
} from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireUser } from "@/src/domain/auth/guard";
import { projectRows, type ProjectRow } from "@/src/domain/cockpit/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { shortAgo } from "@/src/lib/format";

export const dynamic = "force-dynamic";

/** honest ingest word for the meta line — §3.3 idle tones, amber stays scarce. */
function ingestMeta(p: ProjectRow): React.ReactNode {
  if (p.ingestStatus === "ready") return <>ingested</>;
  if (p.ingestStatus === "queued")
    return <span className="text-stone-500">ingest queued</span>;
  return <span className="text-stone-400">not ingested</span>;
}

export default async function ProjectsPage() {
  const user = await requireUser();
  // M13 — THE GUARD: this index lists every project (names, counts,
  // activity) and its rows link to Owner-tier landings; a Collaborator's
  // project surface is their scoped tickets view. Redirect, don't leak.
  if (user.role === "collaborator") redirect("/tickets");

  const [rows, cursor] = await Promise.all([projectRows(), latestCursor()]);

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <div className="max-w-2xl">
        <PageHeader
          kind="routed"
          breadcrumb="Projects"
          nav={
            <Link
              href="/projects/new"
              className="text-stone-700 hover:text-amber-600 cursor-pointer"
            >
              add a project →
            </Link>
          }
        >
          {/* §2.2 — single-word title, period, never the accent. */}
          <h1 className="text-5xl font-bold tracking-tighter">Projects.</h1>

          {rows.length > 0 ? (
            <div className="mt-12">
              <DividedList>
                {rows.map((p) => (
                  <ListRow
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    title={
                      p.pinned ? (
                        <span className="flex items-baseline gap-2">
                          <span className="text-amber-500">★</span>
                          <span>{p.name}</span>
                        </span>
                      ) : (
                        p.name
                      )
                    }
                    meta={
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        <span className="text-stone-900">{p.openCount}</span> open ·{" "}
                        {ingestMeta(p)} · last activity{" "}
                        {p.lastActivityAt ? shortAgo(p.lastActivityAt) : "—"}
                      </span>
                    }
                    arrow
                  />
                ))}
              </DividedList>
            </div>
          ) : (
            <div className="mt-16">
              {/* §2.17 page shape — one sentence, one affordance. */}
              <EmptyState
                shape="page"
                title="No projects yet."
                sentence="Atlas starts when you point it at a codebase."
                action={
                  <Link href="/projects/new">
                    <PillButton kind="primary" size="page" arrow>
                      Add a project
                    </PillButton>
                  </Link>
                }
              />
            </div>
          )}
        </PageHeader>
      </div>
    </main>
  );
}
