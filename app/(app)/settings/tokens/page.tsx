/**
 * M10 — /settings/tokens (XX; PRD #36): the machine-access governance
 * record.
 *
 * Ported from design/variants/variant-xx-tokens.tsx:71–359 — the
 * STANDALONE settings-page shape: breadcrumb + horizontal mono subnav
 * (XX:72–81, §3.2 amber border-b active), `[1fr_320px]` grid (XX:83's
 * 300 folds to 320 — ledger E9), accent hero XX:86–100, rail XX:283–351.
 * Main column interactive sections live in tokens-manager.tsx.
 *
 * Sanctioned deviations (HONESTY, recorded in HANDOFF-M10): the lede +
 * rail copy tell the truth that nothing consumes API tokens yet (charter
 * item 5); XX's mocked token-format prefixes (atb_/ats_/atc_, _live_/_test_)
 * fold to the two REAL formats; the "2FA / Audit log" subnav links point
 * at real pages instead (2FA isn't wired, audit is M11); the
 * reading-list rail section drops (docs are M14); XX:345's session-key
 * signing claim was fiction — replaced with the true at-rest fact.
 */
import { MonoSectionLabel, PageHeader, PageTitle, SubnavLink } from "@/src/components/kit";
import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestCursor } from "@/src/domain/live/broker";
import {
  expiresLabel,
  listApiTokens,
  parseScopes,
  tokenStanding,
} from "@/src/domain/tokens/api-tokens";
import { timeAgo } from "@/src/lib/format";

import { TokensManager, type TokenRowData } from "./tokens-manager";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-mono text-stone-700">{value}</span>
    </div>
  );
}

export default async function TokensPage() {
  await requireOwner();
  const now = new Date();
  const [tokens, cursor] = await Promise.all([listApiTokens(), latestCursor()]);

  const rows: TokenRowData[] = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scopes: parseScopes(t.scopes),
    standing: tokenStanding(t, now),
    expiresLabel: expiresLabel(t.expiresAt, now),
    createdAgo: timeAgo(t.createdAt, now),
  }));
  const active = rows.filter((r) => r.standing === "active").length;
  const expired = rows.filter((r) => r.standing === "expired").length;
  const revoked = rows.filter((r) => r.standing === "revoked").length;

  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <LiveRefresh since={cursor} />
      <PageHeader
        kind="routed"
        breadcrumb="Settings · Security · Access tokens"
        nav={
          <>
            <SubnavLink href="/settings">Settings</SubnavLink>
            <SubnavLink href="/settings/bridges">Bridges</SubnavLink>
            <SubnavLink active>Tokens</SubnavLink>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-[1fr_320px] gap-16">
        <div className="max-w-2xl">
          {/* Hero — XX:85–100 */}
          <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
            Machine-readable identity
          </div>
          <div className="mt-3">
            <PageTitle accent="bearer tokens" after="." wraps>
              {"Your "}
            </PageTitle>
          </div>
          <p className="mt-5 text-xl text-stone-700 leading-relaxed">
            Automation talks to Atlas with these. Treat them like passwords — we never
            show one twice. Nothing consumes them yet; this page is the governance record
            until the public API ships.
          </p>

          <TokensManager rows={rows} />
        </div>

        {/* RAIL — XX:283–351 */}
        <aside className="space-y-12">
          <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              Token format
            </div>
            <div className="mt-4 space-y-3 text-sm font-mono">
              <div className="flex items-baseline justify-between">
                <span className="text-stone-900">atp_</span>
                <span className="text-stone-500 text-xs font-sans">
                  API tokens · this page
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-stone-900">atlas-bridge-</span>
                <span className="text-stone-500 text-xs font-sans">
                  Bridge daemons · Bridges page
                </span>
              </div>
            </div>
            <p className="mt-5 text-xs italic text-stone-500 leading-relaxed">
              Followed by 48 url-safe hex characters. Only the sha-256 of a token is ever
              stored.
            </p>
          </section>

          <section>
            <MonoSectionLabel>Stats</MonoSectionLabel>
            <dl className="mt-5 space-y-3">
              <Stat label="Active tokens" value={String(active)} />
              <Stat label="Expired" value={String(expired)} />
              <Stat label="Force-revoked" value={String(revoked)} />
              <Stat label="Issued lifetime" value={String(rows.length)} />
              <Stat label="Used last 24h" value="0 · no consumer yet" />
            </dl>
          </section>

          <section className="pt-4 border-t border-stone-200/80">
            <p className="text-sm italic text-stone-500 leading-relaxed">
              Atlas stores only the sha-256 of every token — a database leak alone reveals
              nothing usable.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
