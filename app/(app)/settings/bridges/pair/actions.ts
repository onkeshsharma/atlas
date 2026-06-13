"use server";
/**
 * BP2 — Approve server action for the click-to-pair loopback flow
 * (ADR-0004 §4). Guards:
 *   1. requireOwner — only the authenticated Owner may approve.
 *   2. validateCallbackUrl — the cb MUST be a loopback address (hard gate).
 *   3. validatePairState — state nonce must be present and non-empty.
 *   4. validateBridgeName — name must pass the existing name rules.
 *   5. mint only on the explicit approve POST — never on GET.
 *
 * On valid approve: calls the EXISTING `pairBridge` domain fn (same as
 * the paste-token path — no fork, ADR-0004 §4 / charter hard wall),
 * then 302-redirects the browser to
 *   <cb>?token=<once>&state=<state>&name=<machine>
 * The token rides exactly once to loopback; never logged, never in a
 * feed row (the `bridge-paired` row carries the machine name only,
 * as today).
 *
 * On validation error: 302-redirects back to /settings/bridges/pair with
 * an `error` query param so the page renders the honest error screen.
 * This keeps the action signature `Promise<void>` (Next.js form action
 * constraint: form actions must return void).
 *
 * State is echoed UNMODIFIED — BP1 uses it as a CSRF-style nonce to
 * bind the browser session to its loopback listener.
 */
import { redirect } from "next/navigation";

import { requireOwner } from "@/src/domain/auth/guard";
import {
  pairBridge,
  validateBridgeName,
  validateCallbackUrl,
  validatePairState,
} from "@/src/domain/bridge/pairing";

/**
 * The approve POST action. Called from a hidden-input form on the approve
 * screen (no JavaScript needed). On success the browser is 302-redirected
 * to the loopback cb with token+state+name. On validation failure it
 * redirects back to the pair page with ?error=<msg>.
 */
export async function approveAction(formData: FormData): Promise<void> {
  // Guard 1: Owner-only — unauthenticated or Collaborator hits are rejected
  // before any validation or minting (requireOwner redirects non-owners).
  await requireOwner();

  const rawCb = String(formData.get("cb") ?? "");
  const rawState = String(formData.get("state") ?? "");
  const rawName = String(formData.get("name") ?? "");

  /** Redirect back to the pair page with an honest error message. */
  function rejectWithError(message: string): never {
    const errorPath =
      "/settings/bridges/pair" +
      "?cb=" + encodeURIComponent(rawCb) +
      "&state=" + encodeURIComponent(rawState) +
      "&name=" + encodeURIComponent(rawName) +
      "&error=" + encodeURIComponent(message);
    redirect(errorPath);
  }

  // Guard 2: loopback-only cb — the HARD security gate (ADR-0004 §4).
  const cbResult = validateCallbackUrl(rawCb);
  if (!cbResult.ok) rejectWithError(cbResult.message);

  // Guard 3: state must be present and non-empty (CSRF-style nonce).
  const stateResult = validatePairState(rawState);
  if (!stateResult.ok) rejectWithError(stateResult.message);

  // Guard 4: machine name validation (same rules as the paste-token path).
  const nameResult = validateBridgeName(rawName);
  if (!nameResult.ok) rejectWithError(nameResult.message);

  // TypeScript narrowing — all three validated above (rejectWithError throws).
  if (!cbResult.ok || !stateResult.ok || !nameResult.ok) {
    rejectWithError("validation failed");
  }

  // Mint: calls the SAME pairBridge domain fn as the paste-token path —
  // ONE fn, NO fork. `bridge-paired` is still the only feed row emitted.
  // The token is returned once and placed in the redirect URL only; it is
  // never logged, never stored, never put in any other response.
  const mintResult = await pairBridge({ name: nameResult.name, actor: "you" });

  // Build the redirect URL. State is echoed byte-for-byte (ADR-0004 §4).
  // The URL is built from the validated URL object — the loopback gate
  // already ran, so this is safe.
  const target = cbResult.url;
  target.searchParams.set("token", mintResult.token);
  target.searchParams.set("state", stateResult.state);
  target.searchParams.set("name", nameResult.name);

  // 302 redirect — next/navigation redirect() throws internally.
  redirect(target.toString());
}
