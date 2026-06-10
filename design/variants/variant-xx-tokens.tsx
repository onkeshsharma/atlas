// THROWAWAY — Editorial API Tokens prototype.
// Bridge daemon tokens + future Personal Access Tokens. The show-once "copy
// this now or never see it again" pattern is the centrepiece.

import { NAV } from "./mock-data";

type Token = {
  label: string;
  scope: string;
  prefix: string;
  lastUsed: string;
  createdDays: number;
  expires: string;
  current?: boolean;
};

const TOKENS: Token[] = [
  {
    label: "atlas-bridge · this-machine",
    scope: "bridge:dispatch · bridge:heartbeat",
    prefix: "atb_live_e3f2_…",
    lastUsed: "12s ago",
    createdDays: 5,
    expires: "in 85 days",
    current: true,
  },
  {
    label: "ci-runner · github-actions",
    scope: "tickets:read",
    prefix: "atp_ci_94ac_…",
    lastUsed: "4h ago",
    createdDays: 19,
    expires: "in 71 days",
  },
  {
    label: "personal · cli scripts",
    scope: "*",
    prefix: "atp_live_71bb_…",
    lastUsed: "yesterday",
    createdDays: 47,
    expires: "in 43 days",
  },
];

export function VariantXXTokens() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => (
                <a
                  key={n.key}
                  className="relative h-7 w-7 flex items-center justify-center cursor-pointer transition text-stone-400 hover:text-stone-900"
                >
                  <span className="text-base font-medium">{n.short.charAt(0)}</span>
                </a>
              ))}
            </nav>
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </aside>

          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Settings · Security · Access tokens
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <a className="hover:text-stone-900 cursor-pointer">2FA</a>
                <a className="text-stone-900 cursor-pointer border-b border-amber-500 pb-0.5">Tokens</a>
                <a className="hover:text-stone-900 cursor-pointer">Audit log →</a>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_300px] gap-16">
              <div className="max-w-2xl">
                {/* Hero */}
                <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                  Machine-readable identity
                </div>
                <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-[1.05]">
                  Your{" "}
                  <span className="relative">
                    bearer tokens
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
                  </span>
                  .
                </h1>
                <p className="mt-5 text-xl text-stone-700 leading-relaxed">
                  Bridge daemons and any future automation talk to Atlas with
                  these. Treat them like passwords. We never show one twice.
                </p>

                {/* JUST-CREATED PANEL */}
                <section className="mt-12">
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
                    <div className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-widest text-amber-800">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-60" />
                        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                      </span>
                      Token just created · copy it now
                    </div>
                    <p className="mt-3 text-base text-stone-800 leading-relaxed">
                      This is the only time we&rsquo;ll show the full secret.
                      After you leave this page,{" "}
                      <span className="font-semibold">we can&rsquo;t retrieve it</span>
                      &nbsp;— we only store its hash.
                    </p>
                    <div className="mt-5 rounded-xl bg-stone-900 text-stone-50 px-5 py-4 font-mono text-sm flex items-center justify-between gap-4 break-all">
                      <span className="select-all">
                        atb_live_e3f2c481d09fbe5a87412c9f4e1bd8a36e2f714c8d
                      </span>
                      <button className="font-mono text-[10px] uppercase tracking-widest text-stone-50 bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-full whitespace-nowrap">
                        Copy →
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      <div className="flex items-center gap-3">
                        <span>label · atlas-bridge · this-machine</span>
                        <span className="text-stone-300">·</span>
                        <span>scope · bridge:dispatch + bridge:heartbeat</span>
                      </div>
                      <span>expires in 90 days</span>
                    </div>
                    <p className="mt-5 text-sm italic text-stone-500 leading-relaxed">
                      Paste it into <span className="font-mono not-italic text-xs text-stone-700">~/.atlas/config.json</span> at file mode 0600, or run{" "}
                      <span className="font-mono not-italic text-xs text-stone-700">atlas-bridge login --token</span>{" "}
                      with it.
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                        I&rsquo;ve copied it →
                      </a>
                    </div>
                  </div>
                </section>

                {/* EXISTING TOKENS */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      All tokens
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                      {TOKENS.length} active · 0 revoked
                    </span>
                  </div>
                  <ul className="divide-y divide-stone-200">
                    {TOKENS.map((t) => (
                      <li key={t.label} className="py-5">
                        <div className="grid grid-cols-[1fr_auto] items-baseline gap-6">
                          <div>
                            <div className="flex items-baseline gap-3 flex-wrap">
                              <span className="text-base font-medium text-stone-900">
                                {t.label}
                              </span>
                              {t.current && (
                                <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                  active
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 font-mono text-sm text-stone-700 select-all">
                              {t.prefix}
                            </div>
                            <div className="mt-2 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-400 flex-wrap">
                              <span>scope · {t.scope}</span>
                              <span className="text-stone-300">·</span>
                              <span>last used {t.lastUsed}</span>
                              <span className="text-stone-300">·</span>
                              <span>{t.expires}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                              rotate →
                            </a>
                            <a className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-rose-700 cursor-pointer">
                              revoke
                            </a>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* HOW TOKENS WORK */}
                <section className="mt-16">
                  <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                      How they work
                    </h2>
                  </div>
                  <ol className="mt-7 space-y-5 text-base text-stone-700 leading-relaxed">
                    <Note n="01" title="Show once, store hashed">
                      You see the full secret the moment it&rsquo;s created and
                      never again. We Argon2id-hash and store only the hash.
                    </Note>
                    <Note n="02" title="Scoped to one purpose">
                      Each token has explicit scopes (
                      <span className="font-mono text-sm">bridge:dispatch</span>
                      ,{" "}
                      <span className="font-mono text-sm">tickets:read</span>,
                      etc.). The Bridge token can&rsquo;t read your Tickets
                      list; a CI token can&rsquo;t dispatch.
                    </Note>
                    <Note n="03" title="Auto-expire in 90 days">
                      Atlas never issues a permanent token. Rotation is the
                      default; you&rsquo;ll be emailed 7 days before any token
                      expires.
                    </Note>
                    <Note n="04" title="Revoke instantly">
                      Revoking takes effect on the next request — no caching.
                      Any in-flight Job already running with that token
                      finishes; new dispatches fail.
                    </Note>
                  </ol>
                </section>

                {/* CREATE NEW */}
                <section className="mt-16 rounded-2xl bg-white/70 border border-stone-200 p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Create a new token
                  </div>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Label
                      </label>
                      <input
                        type="text"
                        placeholder="staging-bridge · linode-vm-42"
                        className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Scope
                      </label>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Scope label="bridge:dispatch" checked />
                        <Scope label="bridge:heartbeat" checked />
                        <Scope label="tickets:read" />
                        <Scope label="tickets:write" />
                        <Scope label="*" danger />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <a className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer">
                        cancel
                      </a>
                      <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-2 rounded-full">
                        Generate token →
                      </button>
                    </div>
                  </div>
                </section>

                <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
                  Found a leaked token in a git history or pastebin?{" "}
                  <a className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                    revoke it from this page
                  </a>{" "}
                  immediately, then check the{" "}
                  <a className="not-italic font-mono text-xs text-stone-700 hover:text-amber-600 cursor-pointer">
                    audit log →
                  </a>{" "}
                  for unfamiliar requests.
                </p>
              </div>

              {/* RAIL */}
              <aside className="space-y-12">
                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Token format
                  </div>
                  <div className="mt-4 space-y-3 text-sm font-mono">
                    <PrefixRow prefix="atb_" use="bridge daemons" />
                    <PrefixRow prefix="atp_" use="personal access" />
                    <PrefixRow prefix="ats_" use="service-to-service" />
                    <PrefixRow prefix="atc_" use="CI / build-step" />
                  </div>
                  <p className="mt-5 text-xs italic text-stone-500 leading-relaxed">
                    Followed by{" "}
                    <span className="font-mono text-stone-700 not-italic">
                      _live_
                    </span>{" "}
                    or{" "}
                    <span className="font-mono text-stone-700 not-italic">
                      _test_
                    </span>
                    , then 64 url-safe chars.
                  </p>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Stats
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <Stat label="Active tokens" value={String(TOKENS.length)} />
                    <Stat label="Used last 24h" value="2" />
                    <Stat label="Issued lifetime" value="11" />
                    <Stat label="Auto-revoked" value="3 (expiry)" />
                    <Stat label="Force-revoked" value="0" />
                  </dl>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Reading list
                  </div>
                  <ul className="mt-5 space-y-3">
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Threat model
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        concepts · 4 min
                      </div>
                    </li>
                    <li className="group cursor-pointer">
                      <div className="text-sm text-stone-700 group-hover:text-stone-900">
                        Rotating safely
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-stone-400">
                        how-to · 2 min
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Atlas signs every dispatch with your session key as well as
                    the token. Stealing a token alone isn&rsquo;t enough to
                    impersonate you to your Bridge.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant XX · editorial tokens
        </div>
      </div>
    </>
  );
}

function Note({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[40px_1fr] gap-6 items-baseline">
      <span className="font-mono text-xs text-stone-400">{n}</span>
      <div>
        <div className="text-base font-semibold text-stone-900">{title}</div>
        <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
          {children}
        </p>
      </div>
    </li>
  );
}

function Scope({
  label,
  checked,
  danger,
}: {
  label: string;
  checked?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={`px-3 py-1.5 rounded-full border text-xs font-mono cursor-pointer transition ${
        checked
          ? "bg-stone-900 text-stone-50 border-stone-900"
          : danger
          ? "bg-white/50 text-rose-700 border-rose-200 hover:border-rose-400"
          : "bg-white/50 text-stone-700 border-stone-200 hover:border-stone-400"
      }`}
    >
      {label}
    </span>
  );
}

function PrefixRow({ prefix, use }: { prefix: string; use: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-stone-900">{prefix}</span>
      <span className="text-stone-500 text-xs font-sans normal-case">
        {use}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="font-mono text-stone-700">{value}</span>
    </div>
  );
}
