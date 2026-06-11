"use client";
/**
 * M10 — QQ's Field row (variant-qq-profile.tsx:362–412) made editable:
 * the resting markup IS the variant's `[150px_1fr_auto]` dl row; the
 * "edit →" ghost swaps the value for a §2.13 UnderlineInput with real
 * save/cancel and the canon error message shape. Locked rows render the
 * mono "locked" note (QQ:396–399).
 */
import { useState } from "react";
import { useActionState } from "react";

import { PillButton, UnderlineInput } from "@/src/components/kit";

import { updateProfileFieldAction, type FieldState, type ProfileFieldKey } from "./actions";

export function FieldRow({
  label,
  display,
  raw,
  hint,
  field,
  mono = false,
  locked = false,
  placeholder,
}: {
  label: string;
  /** resting display value — may decorate ("@onkesh", "o · derived"). */
  display: React.ReactNode;
  /** the editable raw value. */
  raw?: string;
  hint: string;
  field?: ProfileFieldKey;
  mono?: boolean;
  locked?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<FieldState, FormData>(
    updateProfileFieldAction,
    {},
  );
  // a successful save closes the editor; a §2.13 error keeps it open.
  // (state-from-previous-render pattern — no effect, no cascade.)
  const [prevState, setPrevState] = useState<FieldState>(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.saved) setEditing(false);
  }

  return (
    <div className="py-5 grid grid-cols-[150px_1fr_auto] items-baseline gap-6">
      <span className="font-mono text-xs uppercase tracking-widest text-stone-500">
        {label}
      </span>
      <div>
        {!editing ? (
          <>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-base text-stone-900">{display}</span>
              {state.saved && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-700">
                  ✓ saved
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{hint}</p>
          </>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="field" value={field} />
            <UnderlineInput
              name="value"
              type="text"
              mono={mono}
              defaultValue={raw}
              placeholder={placeholder}
              autoFocus
              validation={state.fieldError ? "error" : undefined}
              message={state.fieldError}
            />
            <div className="mt-3 flex items-center gap-3">
              <PillButton kind="primary" size="xs" type="submit">
                Save →
              </PillButton>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                cancel
              </button>
            </div>
          </form>
        )}
      </div>
      <span className="whitespace-nowrap">
        {locked ? (
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            locked
          </span>
        ) : !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            edit →
          </button>
        ) : null}
      </span>
    </div>
  );
}
