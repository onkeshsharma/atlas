"use client";
/**
 * M10 — guided pairing (PRD #33): N:263–297's register form + XX's
 * show-once panel composed on success. Panel ported from
 * design/variants/variant-xx-tokens.tsx:102–145 (AmberPanel §3.3 +
 * SecretBlock §2.20 + meta row + italic paste hint + "I've copied it");
 * install steps are NumberedSteps (§2.16) with HONEST copy — N:305–328's
 * "downloads the binary, prompts for your Claude Code authorization"
 * story is fiction for v2's daemon (it runs from the repo with two env
 * vars), so the steps say what is true (deviation recorded).
 */
import { useState } from "react";
import { useActionState } from "react";

import {
  AmberPanel,
  NumberedSteps,
  PillButton,
  SecretBlock,
  UnderlineInput,
} from "@/src/components/kit";

import { pairBridgeAction, type PairState } from "./actions";

export function PairingForm({ atlasUrl }: { atlasUrl: string }) {
  const [state, formAction] = useActionState<PairState, FormData>(pairBridgeAction, {});
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const showPanel = state.token && dismissed !== state.token;

  return (
    <div>
      {!showPanel && (
        <form action={formAction}>
          <div className="mt-7 space-y-7">
            <UnderlineInput
              name="name"
              type="text"
              label="Machine name"
              mono
              placeholder="e.g. onkesh-desktop"
              validation={state.fieldError ? "error" : undefined}
              message={state.fieldError}
              hint="re-pairing an existing name rotates its token"
            />
          </div>
          <div className="mt-8 flex items-center gap-4">
            <PillButton kind="primary" size="page" type="submit" arrow>
              Generate token
            </PillButton>
            <span className="italic font-sans text-sm text-stone-500">
              the token shows once on the next step — Atlas keeps only its hash
            </span>
          </div>
        </form>
      )}

      {showPanel && state.token && (
        // XX:104–144 — the show-once panel (§3.3 alarm chrome; §2.4 ctx 7)
        <div className="mt-7">
          <AmberPanel kicker="Token just created · copy it now">
            <p className="mt-3 text-base text-stone-800 leading-relaxed">
              This is the only time we&rsquo;ll show the full secret. After you leave this
              page, <span className="font-semibold">we can&rsquo;t retrieve it</span>
              &nbsp;— we only store its hash.
            </p>
            <div className="mt-5">
              <SecretBlock
                secret={state.token}
                copyLabel={copied ? "Copied ✓" : "Copy →"}
                onCopy={() => {
                  void navigator.clipboard.writeText(state.token ?? "");
                  setCopied(true);
                }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <div className="flex items-center gap-3">
                <span>machine · {state.name}</span>
                <span className="text-stone-300">·</span>
                <span>{state.rotated ? "token rotated" : "new bridge"}</span>
              </div>
              <span>never expires · rotate to replace</span>
            </div>
            <div className="mt-6">
              <NumberedSteps
                steps={[
                  {
                    title: "Copy the token above",
                    body: "It never shows again. Treat it like a password.",
                  },
                  {
                    title: `Start the daemon on ${state.name}`,
                    body: (
                      <>
                        From the Atlas repo on that machine:{" "}
                        <span className="font-mono text-xs text-stone-700 break-all">
                          ATLAS_URL={atlasUrl} ATLAS_BRIDGE_TOKEN=&lt;token&gt; node
                          --no-warnings packages/bridge/src/index.ts
                        </span>{" "}
                        — the Engine flavor defaults to real; set{" "}
                        <span className="font-mono text-xs text-stone-700">
                          ATLAS_BRIDGE_ENGINE=fake
                        </span>{" "}
                        to rehearse without Claude Code.
                      </>
                    ),
                  },
                  {
                    title: "Atlas hears the first heartbeat",
                    body: "Within 30 seconds the machine appears above with a green pulse.",
                  },
                ]}
              />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDismissed(state.token ?? null)}
                className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                I&rsquo;ve copied it →
              </button>
            </div>
          </AmberPanel>
        </div>
      )}
    </div>
  );
}
