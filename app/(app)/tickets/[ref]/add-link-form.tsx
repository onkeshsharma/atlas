"use client";
/**
 * M8 — the notes-footer "+ add" blocker form (F:495–500 draws the
 * affordance; PRD #16 makes it real). Progressive disclosure: the ghost
 * link reveals an UnderlineInput (mono — refs are machine-ish, §2.13) +
 * a micro SegmentedControl for direction + a ghost submit. Errors render
 * as the §2.13 one-quiet-mono-line vocabulary via the kit's validation
 * states.
 */
import { useActionState, useState } from "react";

import { SegmentedControl, UnderlineInput } from "@/src/components/kit";

import { addLinkAction, type AddLinkState } from "./actions";

export function AddLinkForm({ ticketId, ticketRef }: { ticketId: string; ticketRef: string }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("blocked-by");
  const [state, formAction, pending] = useActionState<AddLinkState, FormData>(
    addLinkAction,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer"
      >
        + add
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 w-full space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="ref" value={ticketRef} />
      <input type="hidden" name="direction" value={direction} />
      <UnderlineInput
        name="otherRef"
        label="Ticket ref"
        placeholder="T-247"
        mono
        autoFocus
        validation={state.error ? "error" : undefined}
        message={state.error}
      />
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl
          size="micro"
          options={[
            { value: "blocked-by", label: "blocked by it" },
            { value: "blocks", label: "blocks it" },
          ]}
          value={direction}
          onChange={setDirection}
        />
        <span className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer disabled:text-stone-300"
          >
            add →
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            cancel
          </button>
        </span>
      </div>
    </form>
  );
}
