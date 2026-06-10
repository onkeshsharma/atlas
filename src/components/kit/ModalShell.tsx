/**
 * Kit — ModalShell + ModalPanel + DeleteConfirm.
 *
 * Panel ported from design/variants/variant-jj-delete.tsx:43–44 and
 * variant-y-palette.tsx:91–92 (UU:77's rounded-3xl + ring + amber shadow
 * tint is drift — ledger E8). DeleteConfirm interior ported from
 * variant-jj-delete.tsx:44–141. Governing canon: §2.11 — scrim is
 * `bg-amber-50/60 backdrop-blur-sm` (Y:91's /40 blur-md folds to this).
 */
"use client";

import { useEffect, useState } from "react";

import { MonoSectionLabel } from "./MonoSectionLabel";
import { PillButton } from "./PillButton";
import { UnderlineInput } from "./UnderlineInput";

export type ModalSize = "confirm" | "palette";

/** §2.11 panel chrome — w-full max-w-lg confirm / max-w-2xl palette. */
export function ModalPanel({
  size = "confirm",
  children,
}: {
  size?: ModalSize;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`w-full ${
        size === "palette" ? "max-w-2xl" : "max-w-lg"
      } rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden`}
    >
      {children}
    </div>
  );
}

/**
 * Scrim + positioning + esc-to-close. Confirm modals center (JJ:43);
 * the palette hangs from the top (Y:91 pt-[15vh]). Mount inside a
 * `relative`/`fixed` full-viewport container.
 */
export function ModalShell({
  size = "confirm",
  onClose,
  children,
}: {
  size?: ModalSize;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`absolute inset-0 z-50 bg-amber-50/60 backdrop-blur-sm flex justify-center px-8 ${
        size === "palette" ? "items-start pt-[15vh]" : "items-center"
      }`}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="contents">
        <ModalPanel size={size}>{children}</ModalPanel>
      </div>
    </div>
  );
}

/**
 * §2.11 destructive confirm — rose mono kicker · text-4xl title ·
 * ✕-bulleted consequence list · type-to-confirm underline input with
 * rose focus · footer = ghost cancel + danger-confirm button (JJ:44–141).
 */
export function DeleteConfirm({
  noun,
  name,
  description,
  consequences,
  keeps,
  confirmLabel = "Delete forever",
  onCancel,
  onConfirm,
}: {
  /** what is being deleted — "Delete <name>?" renders the name in mono. */
  noun?: string;
  name: string;
  description: React.ReactNode;
  /** the ✕-bulleted "what goes away" lines (JJ:65–95). */
  consequences: React.ReactNode[];
  /** the emerald "what stays" closing line (JJ:96–105). */
  keeps?: React.ReactNode;
  confirmLabel?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
}) {
  const [typed, setTyped] = useState("");
  const armed = typed === name;
  return (
    <>
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-stone-200">
        <div className="font-mono text-xs uppercase tracking-widest text-rose-700">
          ● Permanent · cannot be undone
        </div>
        <h2 className="mt-3 text-4xl font-bold tracking-tighter leading-tight">
          Delete{noun ? ` ${noun}` : ""} <span className="font-mono text-stone-700">{name}</span>?
        </h2>
        <p className="mt-4 text-base text-stone-700 leading-relaxed">{description}</p>
      </div>

      {/* What goes away */}
      <div className="px-8 py-6 border-b border-stone-200">
        <MonoSectionLabel>What goes away</MonoSectionLabel>
        <ul className="mt-4 space-y-2.5 text-sm">
          {consequences.map((c, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="text-rose-500 mt-1.5">✕</span>
              <span className="text-stone-700">{c}</span>
            </li>
          ))}
        </ul>
        {keeps && (
          <div className="mt-5 flex items-baseline gap-3 pt-4 border-t border-stone-200">
            <span className="text-emerald-600 mt-1.5">●</span>
            <span className="text-sm text-stone-700">{keeps}</span>
          </div>
        )}
      </div>

      {/* Type-to-confirm */}
      <div className="px-8 py-6 border-b border-stone-200">
        <UnderlineInput
          label={
            <>
              Type{" "}
              <span className="text-stone-900 normal-case tracking-normal font-mono bg-stone-100 px-1.5 py-0.5 rounded">
                {name}
              </span>{" "}
              to confirm
            </>
          }
          mono
          focusTone="rose"
          placeholder={name}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="px-8 py-5 flex items-center justify-between bg-stone-50/40">
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-stone-900 cursor-pointer"
        >
          cancel
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            ⏎ to confirm
          </span>
          <PillButton
            kind="danger-confirm"
            size="page"
            disabled={!armed}
            onClick={onConfirm}
            arrow={false}
          >
            {confirmLabel} <span className="text-rose-200">✕</span>
          </PillButton>
        </div>
      </div>
    </>
  );
}
