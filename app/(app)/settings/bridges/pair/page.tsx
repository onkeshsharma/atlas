/**
 * BP2 — /settings/bridges/pair (ADR-0004 §4 server half; charter scope §1).
 *
 * No variant draws this approve screen — it is a charter-sanctioned
 * composition from §2.11 (confirm chrome), §3.3 (AmberPanel), and §3.7
 * (danger framing — though this is not a destructive action, the "what
 * pairing grants" disclosure warrants the same deliberate framing).
 * Canon cited per-element below. Recorded as a sanctioned composition
 * in HANDOFF-BP2.
 *
 * Route params accepted (ADR-0004 §4):
 *   ?name=<machine>   — the machine name the CLI is registering
 *   ?cb=<loopback>    — 127.0.0.1/localhost callback URL (validated here +
 *                       again in the approve server action)
 *   ?state=<nonce>    — echoed unmodified back to the CLI (CSRF-style)
 *   ?error=<msg>      — set by approveAction on re-validation failure
 *                       (POST bounced back with honest error message)
 *
 * Security: the route is Owner-guarded (requireOwner); non-loopback cb
 * renders an honest error screen, not a form. The approve POST is handled
 * by approveAction which re-validates all three inputs before minting.
 * The mint happens only on the explicit POST — never on GET.
 */
import { redirect } from "next/navigation";

import { AmberPanel, PillButton } from "@/src/components/kit";
import { SettingsShell } from "@/src/components/settings/SettingsShell";
import { requireOwner } from "@/src/domain/auth/guard";
import {
  validateBridgeName,
  validateCallbackUrl,
  validatePairState,
} from "@/src/domain/bridge/pairing";

import { approveAction } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Extract the first string value from a searchParam (may be array). */
function firstString(v: string | string[] | undefined): string {
  if (!v) return "";
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v);
}

export default async function PairBridgePage({ searchParams }: PageProps) {
  await requireOwner();

  const params = await searchParams;
  const rawCb = firstString(params.cb);
  const rawState = firstString(params.state);
  const rawName = firstString(params.name);
  // ?error is set by approveAction on re-validation failure (POST bounce)
  const postError = firstString(params.error) || null;

  // Validate cb: the loopback gate. A non-loopback cb gets an error screen
  // — no approve form, no way to mint. This is the visible security gate.
  const cbResult = validateCallbackUrl(rawCb);
  const stateResult = validatePairState(rawState);
  const nameResult = validateBridgeName(rawName);

  // If name and cb are both missing, this was opened without the CLI's params.
  if (!rawName && !rawCb) {
    redirect("/settings/bridges");
  }

  const hasError = !cbResult.ok || !stateResult.ok || !nameResult.ok || postError;
  const errorMessage = postError
    ? postError
    : !cbResult.ok
      ? cbResult.message
      : !stateResult.ok
        ? stateResult.message
        : !nameResult.ok
          ? nameResult.message
          : null;

  return (
    <SettingsShell
      breadcrumb="Settings · Bridges · Pair"
      active="bridges"
      rail={
        // Rail: honest context note — no chrome needed for this flow
        <section>
          <p className="text-sm text-stone-500 leading-relaxed">
            The token is delivered once over loopback and stored only as its
            hash. Your code never leaves your machine.
          </p>
          <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">
            ADR-0004 §4 · loopback callback · one-shot mint
          </div>
        </section>
      }
    >
      {/* Page title — §2.2 routed-page header; single-word title, no accent */}
      <div>
        <h1 className="text-5xl font-bold tracking-tighter">Pair Bridge.</h1>
      </div>

      <div className="mt-10 max-w-xl">
        {hasError ? (
          // Error screen — honest copy, §3.7 danger framing without a
          // full destructive escalation (no rose fill; rose mono label).
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-rose-700">
              Pairing request rejected
            </div>
            <p className="mt-3 text-base text-stone-800 leading-relaxed">
              This pairing request could not be processed:
            </p>
            <p className="mt-2 font-mono text-sm text-rose-700">{errorMessage}</p>
            <p className="mt-4 text-sm text-stone-500 leading-relaxed">
              Run{" "}
              <span className="font-mono text-xs">atlas-bridge pair</span>{" "}
              again on the machine to start a fresh request.
            </p>
            <div className="mt-6">
              <a
                href="/settings/bridges"
                className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 transition"
              >
                ← back to Bridges
              </a>
            </div>
          </div>
        ) : (
          // Approve screen — §3.3 AmberPanel ("demands attention") with
          // the §2.11 confirm chrome pattern (named machine, what it grants,
          // explicit approve + cancel pair). The amber panel marks this as
          // a deliberate one-time decision, not a routine form.
          <AmberPanel kicker="Bridge pairing request">
            <p className="mt-3 text-base text-stone-800 leading-relaxed">
              <span className="font-mono font-semibold">{nameResult.ok ? nameResult.name : rawName}</span>{" "}
              is asking to pair with your Atlas instance.
            </p>
            <p className="mt-3 text-sm text-stone-700 leading-relaxed">
              Approving this request means this machine will be able to{" "}
              <strong>run Engine sessions on your repos and stream them here.</strong>{" "}
              The token is delivered once to{" "}
              <span className="font-mono text-xs text-stone-700">
                {cbResult.ok ? cbResult.url.host : rawCb}
              </span>{" "}
              and stored only as its hash — Atlas never sees the plaintext again.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
              <dl className="space-y-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <div className="flex items-baseline justify-between gap-4">
                  <dt>Machine</dt>
                  <dd className="text-stone-900">{nameResult.ok ? nameResult.name : rawName}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt>Callback</dt>
                  <dd className="text-stone-900">{cbResult.ok ? cbResult.url.host : rawCb}</dd>
                </div>
              </dl>
            </div>

            {/* Approve form — hidden inputs carry cb/state/name through to
                the server action; the POST is the mint gate (never GET). */}
            <form action={approveAction} className="mt-6 flex items-center gap-4">
              <input type="hidden" name="cb" value={rawCb} />
              <input type="hidden" name="state" value={rawState} />
              <input type="hidden" name="name" value={rawName} />
              {/* §2.9 primary pill — the decisive approve action */}
              <PillButton kind="primary" size="page" type="submit" arrow>
                Approve pairing
              </PillButton>
              {/* §3.7 / §2.9 ghost cancel — no destructive chrome (this is
                  not a deletion), just a quiet back-link */}
              <a
                href="/settings/bridges"
                className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 transition"
              >
                Cancel →
              </a>
            </form>

            <p className="mt-5 text-xs italic text-stone-500">
              Cancel returns to Bridges — no token is minted.
            </p>
          </AmberPanel>
        )}
      </div>
    </SettingsShell>
  );
}
