"use client";
/**
 * M8 — the triage action deck + keyboard bindings (variant I:156–196,
 * PRD #12 "keyboard-first"). OptionCards are the kit's (I:210–254 is
 * their source variant); A/B/I/D fire the same server action the cards
 * submit, ←/→ drive the queue cursor. Bindings ignore keystrokes while a
 * form control has focus (nothing here has one today, but the rule keeps
 * the listener honest).
 *
 * Honest copy (canon-over-variant, charter hard wall): I:160's
 * "Approve & dispatch / Send to the Engine now" promises an M9 verb —
 * approve marks the Ticket ready instead; dispatch arrives with the
 * Engine.
 */
import { useEffect, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Kbd, OptionCard } from "@/src/components/kit";

import { triageDecisionAction } from "./actions";

type Decision = "approve" | "backlog" | "needs-info" | "decline";

export function TriageDeck({
  ticketId,
  at,
  prevHref,
  skipHref,
}: {
  ticketId: string;
  /** queue index — the action returns to it so the next ticket slides in. */
  at: number;
  prevHref: string | null;
  skipHref: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const decide = (decision: Decision) => {
    if (pending) return;
    const data = new FormData();
    data.set("ticketId", ticketId);
    data.set("decision", decision);
    data.set("at", String(at));
    startTransition(() => triageDecisionAction(data));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "a") decide("approve");
      else if (key === "b") decide("backlog");
      else if (key === "i") decide("needs-info");
      else if (key === "d") decide("decline");
      else if (key === "arrowleft" && prevHref) router.push(prevHref);
      else if (key === "arrowright" && skipHref) router.push(skipHref);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, at, prevHref, skipHref, pending]);

  return (
    <>
      {/* ACTION ROW (I:156–180) */}
      <section className={`mt-20 grid grid-cols-2 gap-3${pending ? " opacity-60" : ""}`}>
        <OptionCard
          kind="primary"
          kbd="A"
          label="Approve"
          description="Mark ready to dispatch"
          onClick={() => decide("approve")}
        />
        <OptionCard
          kbd="B"
          label="Approve & backlog"
          description="Park it for later"
          onClick={() => decide("backlog")}
        />
        <OptionCard
          kbd="I"
          label="Ask for more info"
          description="Hand it back to the reporter"
          onClick={() => decide("needs-info")}
        />
        <OptionCard
          kind="danger"
          kbd="D"
          label="Decline"
          description="Won't fix"
          onClick={() => decide("decline")}
        />
      </section>

      {/* NAVIGATION ROW (I:182–196) */}
      <div className="mt-10 flex items-center justify-between">
        {prevHref ? (
          <a
            href={prevHref}
            className="group flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer"
          >
            <Kbd>←</Kbd>
            <span>Previous</span>
          </a>
        ) : (
          <span className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-300">
            <Kbd>←</Kbd>
            <span>Previous</span>
          </span>
        )}
        {skipHref ? (
          <a
            href={skipHref}
            className="group flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer"
          >
            <span>Skip</span>
            <Kbd>→</Kbd>
          </a>
        ) : (
          <span className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-300">
            <span>Skip</span>
            <Kbd>→</Kbd>
          </span>
        )}
      </div>
    </>
  );
}
