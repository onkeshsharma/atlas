"use client";
/**
 * M15 — bridge revoke through the §2.11 JJ confirm (PRD #41). M10
 * shipped N:222's "revoke ✕" as a one-click ghost; revocation is
 * destructive-irreversible (the token dies, the daemon goes deaf on its
 * next request), so the ghost is now the §3.7 step-1 OPENER and the JJ
 * recipe (kit ModalShell + DeleteConfirm, ported from
 * design/variants/variant-jj-delete.tsx:43–141) is the confirm. Type
 * the machine name — JJ's own type-the-mono-name pattern (JJ:110–121).
 */
import { useState } from "react";
import { useTransition } from "react";

import { DeleteConfirm, ModalShell, PillButton } from "@/src/components/kit";

import { revokeBridgeAction } from "./actions";

export function RevokeBridge({
  bridgeId,
  name,
  activeRuns,
}: {
  bridgeId: string;
  name: string;
  /** capabilities.busyRunIds.length — names the real blast radius. */
  activeRuns: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <PillButton kind="ghost" ghostDanger onClick={() => setOpen(true)}>
        revoke ✕
      </PillButton>
      {open && (
        <div className="fixed inset-0 z-50">
          <ModalShell onClose={() => setOpen(false)}>
            <DeleteConfirm
              verb="Revoke"
              name={name}
              description={
                <>
                  Atlas stops trusting this machine the moment you confirm. Its
                  token dies — the daemon is refused on its very next request.
                </>
              }
              consequences={[
                <>
                  Its Bridge token — dead immediately; there is no un-revoke
                </>,
                activeRuns > 0 ? (
                  <>
                    <span className="font-mono text-stone-900">{activeRuns}</span>{" "}
                    active Run{activeRuns === 1 ? "" : "s"} on this machine —
                    their daemon goes deaf mid-flight
                  </>
                ) : (
                  <>Dispatching to this machine — stops until you pair it again</>
                ),
              ]}
              keeps={
                <>
                  Run history stays — every Run this machine ran remains on the
                  record. Your code never left it.
                </>
              }
              confirmLabel={pending ? "Revoking…" : "Revoke forever"}
              onCancel={() => setOpen(false)}
              onConfirm={() =>
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("bridgeId", bridgeId);
                  await revokeBridgeAction(fd);
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
