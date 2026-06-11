"use client";
/**
 * M10 — the Tokens main column (XX; PRD #36). Ported from
 * design/variants/variant-xx-tokens.tsx:102–279: show-once panel
 * XX:104–144 (AmberPanel + SecretBlock + meta + italic hint), token
 * rows XX:157–193, How-they-work Notes XX:204–227 (copy made TRUE:
 * sha-256 not Argon2id; scopes recorded-not-enforced until a public
 * API exists; no expiry emails until the Notifier — deviations
 * recorded), create card XX:231–267 (label + ScopeChips + expiry +
 * generate), leaked-token footnote XX:269–279 (audit-log link drops —
 * M11). One client component because create AND rotate feed the same
 * show-once panel.
 */
import { useState } from "react";
import { useActionState, useTransition } from "react";

import {
  AmberPanel,
  FeaturedCard,
  NumberedSteps,
  PillButton,
  ScopeChip,
  SecretBlock,
  SegmentedControl,
  UnderlineInput,
} from "@/src/components/kit";

import {
  createTokenAction,
  revokeTokenAction,
  rotateTokenAction,
  type TokenActionState,
} from "./actions";

export type TokenRowData = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  standing: "active" | "expired" | "revoked";
  expiresLabel: string;
  createdAgo: string;
};

const SCOPE_OPTIONS = [
  { label: "tickets:read" },
  { label: "tickets:write" },
  { label: "projects:read" },
  { label: "runs:read" },
  { label: "*", danger: true },
];

function StandingChip({ standing }: { standing: TokenRowData["standing"] }) {
  if (standing === "active") {
    return (
      <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
        active
      </span>
    );
  }
  return (
    <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
      {standing}
    </span>
  );
}

export function TokensManager({ rows }: { rows: TokenRowData[] }) {
  const [createState, createAction] = useActionState<TokenActionState, FormData>(
    createTokenAction,
    {},
  );
  const [rotateState, setRotateState] = useState<TokenActionState>({});
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>(["tickets:read"]);

  // the freshest secret wins the panel; "I've copied it" clears it.
  const shown = rotateState.token ?? createState.token;
  const shownName = rotateState.token ? rotateState.name : createState.name;
  const showPanel = shown && dismissed !== shown;

  const active = rows.filter((r) => r.standing === "active").length;
  const revoked = rows.filter((r) => r.standing === "revoked").length;

  const toggleScope = (label: string) => {
    setScopes((prev) => {
      if (label === "*") return prev.includes("*") ? [] : ["*"];
      const without = prev.filter((s) => s !== "*");
      return without.includes(label)
        ? without.filter((s) => s !== label)
        : [...without, label];
    });
  };

  return (
    <>
      {/* JUST-CREATED PANEL — XX:102–145 */}
      {showPanel && shown && (
        <section className="mt-12">
          <AmberPanel kicker="Token just created · copy it now">
            <p className="mt-3 text-base text-stone-800 leading-relaxed">
              This is the only time we&rsquo;ll show the full secret. After you leave this
              page, <span className="font-semibold">we can&rsquo;t retrieve it</span>
              &nbsp;— we only store its hash.
            </p>
            <div className="mt-5">
              <SecretBlock
                secret={shown}
                copyLabel={copied ? "Copied ✓" : "Copy →"}
                onCopy={() => {
                  void navigator.clipboard.writeText(shown);
                  setCopied(true);
                }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
              <div className="flex items-center gap-3">
                <span>label · {shownName}</span>
                {rotateState.token && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span>rotated — the old secret is dead</span>
                  </>
                )}
              </div>
              <span>expires per its row below</span>
            </div>
            <p className="mt-5 text-sm italic text-stone-500 leading-relaxed">
              Nothing consumes API tokens yet — store it somewhere safe (a secrets
              manager, file mode 0600) for the day the public API ships.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDismissed(shown);
                  setCopied(false);
                }}
                className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
              >
                I&rsquo;ve copied it →
              </button>
            </div>
          </AmberPanel>
        </section>
      )}

      {/* EXISTING TOKENS — XX:147–195 */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
            All tokens
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
            {active} active · {revoked} revoked
          </span>
        </div>
        {rows.length === 0 ? (
          // §2.17 — one quiet sentence, one affordance (the card below)
          <p className="mt-6 text-sm italic text-stone-500">
            No tokens yet — create the first one below.
          </p>
        ) : (
          <ul className="divide-y divide-stone-200">
            {rows.map((t) => (
              <li key={t.id} className="py-5">
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-6">
                  <div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className={`text-base font-medium ${
                          t.standing === "revoked" ? "text-stone-400 line-through" : "text-stone-900"
                        }`}
                      >
                        {t.name}
                      </span>
                      <StandingChip standing={t.standing} />
                    </div>
                    <div className="mt-1.5 font-mono text-sm text-stone-700 select-all">
                      {t.prefix}
                    </div>
                    {/* XX:175–181's three-segment meta — convergence r1: the
                        created segment dropped, expiry in the bare "in N days" form */}
                    <div className="mt-2 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400 flex-wrap">
                      <span>scope · {t.scopes.join(" · ")}</span>
                      <span className="text-stone-300">·</span>
                      <span>last used never</span>
                      <span className="text-stone-300">·</span>
                      <span>{t.standing === "revoked" ? `revoked · created ${t.createdAgo}` : t.expiresLabel}</span>
                    </div>
                  </div>
                  {t.standing !== "revoked" && (
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const res = await rotateTokenAction({ id: t.id, name: t.name });
                            setRotateState(res);
                            setDismissed(null);
                            setCopied(false);
                          })
                        }
                        className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                      >
                        rotate →
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startTransition(() => revokeTokenAction({ id: t.id }))}
                        className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-700 cursor-pointer"
                      >
                        revoke
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* HOW TOKENS WORK — XX:197–228, copy made true */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
          <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
            How they work
          </h2>
        </div>
        <div className="mt-7">
          <NumberedSteps
            steps={[
              {
                title: "Show once, store hashed",
                body: "You see the full secret the moment it’s created and never again. Atlas keeps only the sha-256 hash.",
              },
              {
                title: "Scoped to one purpose",
                body: "Each token records explicit scopes. Nothing consumes API tokens yet — scopes are the governance record now, enforced the day the public API ships.",
              },
              {
                title: "Expiry is the default",
                body: "Every token gets an expiry — 30, 90 or 365 days. Rotating restarts the clock with a fresh secret.",
              },
              {
                title: "Revoke instantly",
                body: "Revoking marks the token dead immediately. Any future consumer checks that mark on every request — no caching.",
              },
            ]}
          />
        </div>
      </section>

      {/* CREATE NEW — XX:230–267 */}
      <section className="mt-16">
        <FeaturedCard padding="6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
            Create a new token
          </div>
          <form action={createAction} className="mt-5 space-y-4">
            <UnderlineInput
              name="name"
              type="text"
              label="Label"
              placeholder="ci-runner · github-actions"
              validation={createState.fieldError ? "error" : undefined}
              message={createState.fieldError}
            />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Scope
              </span>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {SCOPE_OPTIONS.map((s) => (
                  <ScopeChip
                    key={s.label}
                    selected={scopes.includes(s.label)}
                    danger={s.danger}
                    onClick={() => toggleScope(s.label)}
                  >
                    {s.label}
                  </ScopeChip>
                ))}
                {scopes.map((s) => (
                  <input key={s} type="hidden" name="scopes" value={s} />
                ))}
              </div>
              {createState.scopeError && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-rose-700">
                  {createState.scopeError}
                </p>
              )}
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                Expires
              </span>
              <div className="mt-2">
                <ExpiryChoice />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <PillButton kind="primary" size="inline" type="submit" arrow>
                Generate token
              </PillButton>
            </div>
          </form>
        </FeaturedCard>
      </section>

      {/* footnote — XX:269–279 (audit-log link arrives with M11) */}
      <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
        Found a leaked token in a git history or pastebin?{" "}
        <span className="not-italic font-mono text-xs text-stone-700">
          revoke it from this page
        </span>{" "}
        immediately — revocation beats every future request.
      </p>
    </>
  );
}

function ExpiryChoice() {
  const [days, setDays] = useState("90");
  return (
    <>
      <SegmentedControl
        size="compact"
        options={[
          { value: "30", label: "30 days" },
          { value: "90", label: "90 days" },
          { value: "365", label: "1 year" },
        ]}
        value={days}
        onChange={setDays}
      />
      <input type="hidden" name="expiresDays" value={days} />
    </>
  );
}
