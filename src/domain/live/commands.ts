/**
 * M6 — Live protocol: the command channel (browser → Atlas → Bridge).
 *
 * RESERVED for M9 (charter §3): v2.0 steering is watch + cancel +
 * answer-when-asked (CONTEXT.md). The vocabulary is fixed now so the
 * Engine module wires executors without protocol changes; nothing in
 * M6 sends or handles these.
 */
import type { NeedsInputAnswer } from "../run/needs-input";

export type LiveCommand =
  | { type: "cancel-run"; runId: string }
  | { type: "answer-run"; runId: string; answer: NeedsInputAnswer };

export type LiveCommandType = LiveCommand["type"];
