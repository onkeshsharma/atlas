// THROWAWAY — Editorial Triage inbox prototype.
// Single ticket at a time, centered editorial reading column.
// Keyboard-first: A approve, B backlog, I more info, D decline, ←/→ navigate.

import { NAV } from "./mock-data";

const TICKET = {
  position: 1,
  total: 5,
  id: "T-303",
  title: "Make export buttons more discoverable",
  kind: "enhancement",
  reporter: "ada@acme.io",
  filed: "12 minutes ago",
  body: `When I open the ticket list page on acme-website, I can't find any obvious way to export the data. I know we shipped JSON export in #574e9115 but the buttons feel buried — they're in the overflow menu and the icon doesn't read as "download" to me.

Could we surface the export options as primary affordances near the top of the ticket list? Even just a small "Export" link in the toolbar would help. Bonus if there's a clear CSV/JSON choice without having to open a dropdown.

I'd also love a way to export the current filtered view, not just everything — that'd be huge for our quarterly review prep.`,
  hint: {
    kind: "enhancement",
    severity: "low",
    similarTo: "#574e9115",
    confidence: "high",
    likelyFiles: [
      "app/(authed)/projects/[id]/tickets/page.tsx",
      "src/components/TicketExport.tsx",
    ],
  },
};

export function VariantITriage() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        <div className="flex min-h-screen">
          {/* SIDEBAR — T (Triage) is active */}
          <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none">a</div>
            </div>
            <nav className="flex flex-col items-center gap-5">
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "triage";
                return (
                  <a
                    key={n.key}
                    className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
                      isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
                    }`}
                  >
                    <span className={`text-base ${isActive ? "font-semibold" : "font-medium"}`}>
                      {initial}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
                    )}
                    {n.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                        {n.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            <div className="relative group">
              <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
                <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
                  o
                </div>
                <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* MAIN — centered editorial reading, single ticket */}
          <main className="flex-1 px-16 pt-8 pb-24 flex flex-col">
            {/* Top: breadcrumb + triage counter (justify-between) */}
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · Triage
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-stone-700">
                <span className="text-stone-900 font-medium">{TICKET.position}</span>
                <span className="text-stone-400"> of </span>
                <span>{TICKET.total}</span>
              </div>
            </div>

            {/* Centered editorial reading column */}
            <div className="mt-16 mx-auto max-w-2xl w-full">
              {/* Metadata strip (kind · reporter · age) — mono uppercase */}
              <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
                <span className="text-stone-700">{TICKET.kind}</span>
                <span className="mx-2 text-stone-300">·</span>
                filed by{" "}
                <span className="text-stone-700">{TICKET.reporter}</span>
                <span className="mx-2 text-stone-300">·</span>
                {TICKET.filed}
              </div>

              {/* Title — biggest editorial hero we use */}
              <h1 className="mt-3 text-5xl font-bold tracking-tighter leading-tight">
                {TICKET.title}
              </h1>

              {/* Body — editorial prose */}
              <div className="mt-12 space-y-5 text-lg text-stone-700 leading-relaxed">
                {TICKET.body.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {/* AI section — engine reading inline */}
              <section className="mt-16 pt-10 border-t border-stone-200">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  AI
                </div>
                <p className="mt-5 text-base text-stone-700 leading-relaxed">
                  The Engine reads this as an{" "}
                  <span className="font-semibold text-stone-900">enhancement</span> at{" "}
                  <span className="font-semibold text-stone-900">low</span> severity.
                  Similar to{" "}
                  <a className="text-amber-600 hover:underline cursor-pointer">
                    {TICKET.hint.similarTo}
                  </a>
                  . It&rsquo;ll likely touch{" "}
                  <a className="font-mono text-sm text-stone-600 hover:text-amber-600 cursor-pointer">
                    page.tsx
                  </a>{" "}
                  and{" "}
                  <a className="font-mono text-sm text-stone-600 hover:text-amber-600 cursor-pointer">
                    TicketExport.tsx
                  </a>
                  .
                </p>

                {/* Confidence meter */}
                <div className="mt-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  <span>Confidence</span>
                  <span className="flex items-center gap-0.5">
                    <span className="inline-block h-3 w-1.5 bg-amber-500" />
                    <span className="inline-block h-3 w-1.5 bg-amber-500" />
                    <span className="inline-block h-3 w-1.5 bg-amber-500" />
                    <span className="inline-block h-3 w-1.5 bg-stone-200" />
                    <span className="inline-block h-3 w-1.5 bg-stone-200" />
                  </span>
                  <span className="text-stone-700">high</span>
                </div>
              </section>

              {/* ACTION ROW — 4 primary action buttons with kbd shortcuts */}
              <section className="mt-20 grid grid-cols-2 gap-3">
                <ActionButton
                  shortcut="A"
                  label="Approve & dispatch"
                  description="Send to the Engine now"
                  primary
                />
                <ActionButton
                  shortcut="B"
                  label="Approve & backlog"
                  description="Park it for later"
                />
                <ActionButton
                  shortcut="I"
                  label="Ask for more info"
                  description="Reply to the reporter"
                />
                <ActionButton
                  shortcut="D"
                  label="Decline"
                  description="Won't fix · with a note"
                  danger
                />
              </section>

              {/* NAVIGATION ROW — prev / skip with kbd arrows */}
              <div className="mt-10 flex items-center justify-between">
                <a className="group flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer">
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                    ←
                  </kbd>
                  <span>Previous</span>
                </a>
                <a className="group flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer">
                  <span>Skip</span>
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded font-mono text-[10px] uppercase bg-stone-100 text-stone-700 border border-stone-200">
                    →
                  </kbd>
                </a>
              </div>
            </div>
          </main>
        </div>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant I · editorial triage
        </div>
      </div>
    </>
  );
}

function ActionButton({
  shortcut,
  label,
  description,
  primary,
  danger,
}: {
  shortcut: string;
  label: string;
  description: string;
  primary?: boolean;
  danger?: boolean;
}) {
  const baseClasses =
    "group flex flex-col items-start gap-1.5 rounded-2xl border p-5 text-left transition cursor-pointer";
  const colourClasses = primary
    ? "border-stone-900 bg-stone-900 text-stone-50 hover:bg-stone-700"
    : danger
    ? "border-stone-200 bg-white text-stone-700 hover:border-rose-300 hover:text-rose-700"
    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900";
  const kbdClasses = primary
    ? "bg-stone-700 text-stone-100 border-stone-600"
    : danger
    ? "bg-stone-100 text-stone-700 border-stone-200 group-hover:bg-rose-50 group-hover:text-rose-700 group-hover:border-rose-200"
    : "bg-stone-100 text-stone-700 border-stone-200";
  const descClasses = primary
    ? "text-stone-300"
    : "text-stone-500";

  return (
    <button className={`${baseClasses} ${colourClasses}`}>
      <div className="flex items-center gap-3">
        <kbd
          className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded font-mono text-xs uppercase border ${kbdClasses}`}
        >
          {shortcut}
        </kbd>
        <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-xs italic font-sans ${descClasses}`}>
        {description}
      </div>
    </button>
  );
}
