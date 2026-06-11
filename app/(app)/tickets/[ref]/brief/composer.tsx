"use client";
/**
 * M9 Session B — W's composer body (the client half: editor state,
 * tabs, debounced autosave, dispatch).
 *
 * Ported from design/variants/variant-w-brief.tsx:90–173 (breadcrumb +
 * draft pulse, hero, tabs, border-t mono editor, char-count meta row,
 * dispatch row). All three tabs are REAL: Preview renders the markdown
 * (BriefProse), Diff-from-auto-draft line-diffs the editor against the
 * Engine's draft (KK's wash classes — one diff vocabulary everywhere).
 *
 * Canon over variant:
 * - §2.9 strict-dot (ledger pass 2026-06-11): W:161's standalone
 *   page-scale dispatch pill drops its dot (the S:169/M8 precedent);
 *   the trailing `→` stays.
 * - §3.6: "save draft & close ↗" navigates WITHIN Atlas → `→`.
 * Honest adaptations (flagged in HANDOFF-M9):
 * - W:144 "~320 tokens" — chars are real; the token figure is a stated
 *   estimate (chars/4) and labelled `~est`.
 * - W:158's "Estimated quota: ~5 minutes" is unknowable — dropped.
 * - "discard draft" reverts the EDITOR to the Engine draft (rows are
 *   append-only; nothing silently deletes).
 */
import { useEffect, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { LivePulse, SegmentedControl } from "@/src/components/kit";
import { BriefProse } from "@/src/components/run/BriefProse";
import { hasDiff, lineDiff } from "@/src/components/run/line-diff";
import { shortAgo } from "@/src/lib/format";

import { dispatchBriefAction, saveBriefAction } from "./actions";

const AUTOSAVE_MS = 1_500;

export function BriefComposer({
  ticketId,
  ticketRef,
  initialBriefId,
  initialBody,
  initialSavedAt,
  engineDraft,
  canDispatch,
  dispatchHint,
  bridgeMachine,
  hero,
}: {
  ticketId: string;
  ticketRef: string;
  /** the owner draft row the editor continues, when one exists. */
  initialBriefId: string | null;
  initialBody: string;
  initialSavedAt: string | null;
  /** the Engine's draft — the Diff tab's baseline (null = none yet). */
  engineDraft: string | null;
  /** dispatch is approved-only (the detail CTA's same honesty). */
  canDispatch: boolean;
  dispatchHint: string | null;
  bridgeMachine: string | null;
  /** the server-rendered W:107–120 hero — sits between breadcrumb and tabs. */
  hero: React.ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"edit" | "preview" | "diff">("edit");
  const [body, setBody] = useState(initialBody);
  const [briefId, setBriefId] = useState(initialBriefId);
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatching, startDispatch] = useTransition();

  const dirty = body !== savedBody;

  // debounced autosave (W:146 "autosave on" — made real). The effect
  // re-arms per keystroke, so the closure always saves the latest body.
  useEffect(() => {
    if (!dirty || !body.trim()) return;
    const timer = setTimeout(() => {
      setSaving(true);
      void saveBriefAction({ ticketId, briefId, body })
        .then((result) => {
          if (result.ok) {
            setBriefId(result.briefId);
            setSavedAt(result.savedAt);
            setSavedBody(body);
          }
        })
        .finally(() => setSaving(false));
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [body, briefId, dirty, ticketId]);

  const saveAndClose = () => {
    const go = () => router.push(`/tickets/${ticketRef}`);
    if (!dirty || !body.trim()) {
      go();
      return;
    }
    setSaving(true);
    void saveBriefAction({ ticketId, briefId, body }).then(go);
  };

  const dispatch = () => {
    setDispatchError(null);
    startDispatch(async () => {
      const result = await dispatchBriefAction({ ticketId, briefId, body });
      // success redirects server-side; only failures return.
      if (result && !result.ok) setDispatchError(result.reason);
    });
  };

  const chars = body.length;
  const tokens = Math.round(chars / 4);
  const diffRows = engineDraft !== null ? lineDiff(engineDraft, body) : [];

  return (
    <>
      {/* Top breadcrumb + draft indicator (W:92–103) */}
      <div className="flex items-baseline justify-between gap-8">
        <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
          Tickets · {ticketRef} · Brief
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 flex items-center gap-2">
          <LivePulse color="amber" weight="50" />
          {saving
            ? "draft · saving…"
            : dirty
              ? "draft · unsaved edits"
              : savedAt
                ? `draft · saved ${shortAgo(new Date(savedAt))}`
                : "draft · not saved yet"}
        </div>
      </div>

      {hero}

      {/* Tabs (W:123–134) — kit SegmentedControl, dot axis on Edit */}
      <div className="mt-12">
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: "edit", label: "Edit", dot: "amber" },
            { value: "preview", label: "Preview" },
            ...(engineDraft !== null ? [{ value: "diff", label: "Diff from auto-draft" }] : []),
          ]}
        />
      </div>

      {/* Editor (W:137–147) */}
      {tab === "edit" && (
        <div className="mt-7">
          <textarea
            rows={28}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="## Goal&#10;&#10;Tell the Engine exactly what done looks like…"
            aria-label="Brief body"
            className="w-full bg-transparent border-t border-stone-200 pt-6 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition resize-none leading-relaxed"
          />
          <div className="mt-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
            <span>
              Markdown · {chars.toLocaleString()} chars · ~{tokens.toLocaleString()} tokens est
            </span>
            <span>autosave on</span>
          </div>
        </div>
      )}

      {/* Preview — the markdown, rendered (real tab) */}
      {tab === "preview" && (
        <div className="mt-7 border-t border-stone-200 pt-6">
          {body.trim() ? (
            <BriefProse markdown={body} />
          ) : (
            <p className="text-sm italic text-stone-500">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Diff from auto-draft — real line diff (KK's wash vocabulary) */}
      {tab === "diff" && engineDraft !== null && (
        <div className="mt-7 border-t border-stone-200 pt-6">
          {hasDiff(diffRows) ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden font-mono text-xs leading-relaxed">
              {diffRows.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[18px_1fr] gap-2 px-2 py-0.5 ${
                    row.kind === "add"
                      ? "bg-emerald-50"
                      : row.kind === "remove"
                        ? "bg-rose-50"
                        : ""
                  }`}
                >
                  <span
                    className={`select-none ${
                      row.kind === "add"
                        ? "text-emerald-700"
                        : row.kind === "remove"
                          ? "text-rose-700"
                          : "text-stone-300"
                    }`}
                  >
                    {row.kind === "add" ? "+" : row.kind === "remove" ? "−" : " "}
                  </span>
                  <span className="text-stone-700 whitespace-pre-wrap">{row.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-stone-500">
              No edits yet — the editor matches the Engine&rsquo;s draft.
            </p>
          )}
        </div>
      )}

      {/* Dispatch row (W:150–172) */}
      <section className="mt-16 pt-10 border-t border-stone-200">
        <p className="text-base text-stone-700 leading-relaxed">
          When you dispatch, Atlas sends this Brief to the Engine
          {bridgeMachine ? (
            <>
              {" "}
              running on <span className="font-mono text-sm text-stone-900">{bridgeMachine}</span>
            </>
          ) : (
            <> — it queues until a Bridge connects</>
          )}
          . The Engine reads it verbatim, works in the Run&rsquo;s own worktree, and hands you
          a diff to review.
        </p>
        <div className="mt-8 flex items-center gap-4 flex-wrap">
          {/* canon §2.9 strict-dot: standalone page-scale pill, no dot (W:162 is the ruled drift) */}
          <button
            type="button"
            onClick={dispatch}
            disabled={!canDispatch || dispatching || !body.trim()}
            className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 disabled:bg-stone-300 disabled:cursor-not-allowed px-6 py-3.5 rounded-full shadow-sm inline-flex items-center gap-2 cursor-pointer transition"
          >
            {dispatching ? "Dispatching…" : "Dispatch to Engine"}
            <span className="text-stone-400">→</span>
          </button>
          {/* canon §3.6: stays in Atlas → `→` (W:167's ↗ overruled) */}
          <button
            type="button"
            onClick={saveAndClose}
            className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            save draft &amp; close →
          </button>
          {engineDraft !== null && body !== engineDraft && (
            <button
              type="button"
              onClick={() => setBody(engineDraft)}
              className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-rose-600 cursor-pointer"
            >
              discard edits
            </button>
          )}
        </div>
        {(dispatchHint || dispatchError) && (
          <p className="mt-3 text-xs italic text-stone-500">
            {dispatchError ? `dispatch failed — ${dispatchError}` : dispatchHint}
          </p>
        )}
      </section>
    </>
  );
}
