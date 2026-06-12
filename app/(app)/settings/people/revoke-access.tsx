"use client";
/**
 * M15 — instance-access revoke through the §2.11 JJ confirm (PRD #41).
 * M11 shipped WW:216–223's "revoke access" as a one-click ghost; the
 * action DELETES rows (the membership + every project roster grant —
 * src/domain/people/roster.ts revokeInstanceAccess), which is
 * destructive-irreversible, so the ghost is now the §3.7 step-1 OPENER
 * and the JJ recipe (kit ModalShell + DeleteConfirm, ported from
 * design/variants/variant-jj-delete.tsx:43–141) is the confirm. Type
 * the person's display name. Reversible ghost-confirms (project-roster
 * remove with its re-add path, invite cancel) stay §3.7 — recorded in
 * notes/M15-manual-test.md.
 */
import { useState } from "react";
import { useTransition } from "react";

import { DeleteConfirm, ModalShell } from "@/src/components/kit";

import { revokeAccessAction } from "./actions";

export function RevokeAccess({
  userId,
  displayName,
  projectCount,
}: {
  userId: string;
  displayName: string;
  /** real roster blast radius — their project_members rows. */
  projectCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-700 cursor-pointer"
      >
        revoke access
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <ModalShell onClose={() => setOpen(false)}>
            <DeleteConfirm
              verb="Revoke"
              noun="access for"
              name={displayName}
              description={
                <>
                  Atlas forgets this person the moment you confirm. Their
                  membership and every roster grant are deleted — this is the
                  whole instance, not one Project.
                </>
              }
              consequences={[
                <>Their Collaborator membership — gone from this Atlas immediately</>,
                projectCount > 0 ? (
                  <>
                    Their place on{" "}
                    <span className="font-mono text-stone-900">{projectCount}</span>{" "}
                    Project roster{projectCount === 1 ? "" : "s"}
                  </>
                ) : (
                  <>Any future roster grant — there is nothing to restore from</>
                ),
                <>
                  Their signed-in sessions — the next request lands on the
                  no-access gate
                </>,
              ]}
              keeps={
                <>
                  Their Tickets and the feed history stay — the record survives.
                  So does their sign-in identity; you can invite them again any
                  time, from zero.
                </>
              }
              confirmLabel={pending ? "Revoking…" : "Revoke forever"}
              onCancel={() => setOpen(false)}
              onConfirm={() =>
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("userId", userId);
                  await revokeAccessAction(fd);
                  setOpen(false);
                })
              }
            />
          </ModalShell>
        </div>
      )}
    </>
  );
}
