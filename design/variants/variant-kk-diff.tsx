// THROWAWAY — Editorial Diff Viewer prototype.
// What the Owner sees when they peek inside a PR before approving.

import { NAV } from "./mock-data";

type Hunk = {
  header: string;
  lines: Array<{ kind: "context" | "add" | "remove"; n?: string; text: string }>;
};

type DiffFile = {
  path: string;
  status: "new" | "modified" | "deleted";
  added: number;
  removed: number;
  hunks: Hunk[];
};

const FILES: DiffFile[] = [
  {
    path: "src/lib/ticket-export.ts",
    status: "new",
    added: 47,
    removed: 0,
    hunks: [
      {
        header: "@@ -0,0 +1,18 @@",
        lines: [
          { kind: "add", n: "1", text: "import { Ticket } from \"./types\";" },
          { kind: "add", n: "2", text: "" },
          { kind: "add", n: "3", text: "export function ticketsToJson(tickets: Ticket[]) {" },
          { kind: "add", n: "4", text: "  return JSON.stringify(" },
          { kind: "add", n: "5", text: "    tickets.map((t) => ({" },
          { kind: "add", n: "6", text: "      id: t.id," },
          { kind: "add", n: "7", text: "      title: t.title," },
          { kind: "add", n: "8", text: "      state: t.state," },
          { kind: "add", n: "9", text: "      reporter: t.reporter," },
          { kind: "add", n: "10", text: "      ageDays: ageInDays(t.filedAt)," },
          { kind: "add", n: "11", text: "    })),", },
          { kind: "add", n: "12", text: "    null," },
          { kind: "add", n: "13", text: "    2,", },
          { kind: "add", n: "14", text: "  );", },
          { kind: "add", n: "15", text: "}", },
        ],
      },
    ],
  },
  {
    path: "app/(authed)/projects/[id]/tickets/page.tsx",
    status: "modified",
    added: 6,
    removed: 2,
    hunks: [
      {
        header: "@@ -42,7 +42,11 @@",
        lines: [
          { kind: "context", n: "42", text: "<div className=\"toolbar\">" },
          { kind: "context", n: "43", text: "  <FilterChips />" },
          { kind: "context", n: "44", text: "  <DensityToggle />" },
          { kind: "remove", n: "45", text: "  <button onClick={onExportCsv}>" },
          { kind: "remove", n: "46", text: "    Export CSV" },
          { kind: "add", n: "45", text: "  <ExportMenu" },
          { kind: "add", n: "46", text: "    onCsv={onExportCsv}" },
          { kind: "add", n: "47", text: "    onJson={onExportJson}" },
          { kind: "add", n: "48", text: "    includeArchived={includeArchived}" },
          { kind: "add", n: "49", text: "  >" },
          { kind: "add", n: "50", text: "    Export ▾" },
          { kind: "context", n: "51", text: "  </button>" },
          { kind: "context", n: "52", text: "</div>" },
        ],
      },
    ],
  },
];

export function VariantKKDiff() {
  const totalAdded = FILES.reduce((a, f) => a + f.added, 0);
  const totalRemoved = FILES.reduce((a, f) => a + f.removed, 0);

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
              {NAV.map((n) => {
                const initial = n.short.charAt(0);
                const isActive = n.key === "projects";
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
                  </a>
                );
              })}
            </nav>
            <div className="relative h-6 w-6 flex items-center justify-center">
              <div className="text-xl font-bold tracking-tighter leading-none text-stone-900">o</div>
              <span className="absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </aside>

          <main className="flex-1 px-16 pt-8 pb-24">
            <div className="flex items-baseline justify-between gap-8">
              <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
                Projects · acme-website · T-249 · PR #892 · Diff
              </div>
              <a className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                open on GitHub ↗
              </a>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_320px] gap-16">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tighter leading-tight">
                  Add JSON export endpoint
                </h1>
                <div className="mt-4 font-mono text-xs uppercase tracking-widest text-stone-500">
                  <span className="text-emerald-700">+{totalAdded}</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span className="text-rose-700">−{totalRemoved}</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span>{FILES.length} files changed</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span>Engine commit · 2h ago</span>
                </div>

                {/* Editorial summary above the code */}
                <div className="mt-8 relative pl-6">
                  <span className="absolute -left-1 -top-2 font-bold text-4xl text-emerald-400/80 leading-none select-none">
                    &ldquo;
                  </span>
                  <p className="text-base italic text-stone-800 leading-relaxed">
                    Replaces the standalone <span className="not-italic font-mono text-sm">Export CSV</span>{" "}
                    button with a dropdown that offers CSV (existing) and JSON (new),
                    backed by a new <span className="not-italic font-mono text-sm">ticket-export.ts</span>{" "}
                    module.
                  </p>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Engine summary
                  </div>
                </div>

                {/* Diff files */}
                <div className="mt-12 space-y-12">
                  {FILES.map((file) => (
                    <section key={file.path}>
                      <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                        <div className="flex items-baseline gap-3">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-widest ${
                              file.status === "new"
                                ? "text-emerald-700"
                                : file.status === "deleted"
                                ? "text-rose-700"
                                : "text-amber-700"
                            }`}
                          >
                            {file.status}
                          </span>
                          <span className="font-mono text-sm text-stone-900">
                            {file.path}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-3 font-mono text-[10px]">
                          <span className="text-emerald-700">+{file.added}</span>
                          <span className="text-rose-700">−{file.removed}</span>
                        </div>
                      </div>

                      {file.hunks.map((hunk, hi) => (
                        <div key={hi} className="mt-4">
                          <div className="font-mono text-[10px] text-stone-400 mb-2">
                            {hunk.header}
                          </div>
                          <div className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden font-mono text-xs leading-relaxed">
                            {hunk.lines.map((line, i) => (
                              <div
                                key={i}
                                className={`grid grid-cols-[40px_18px_1fr] gap-2 px-2 py-0.5 ${
                                  line.kind === "add"
                                    ? "bg-emerald-50"
                                    : line.kind === "remove"
                                    ? "bg-rose-50"
                                    : ""
                                }`}
                              >
                                <span className="text-stone-400 text-right select-none">
                                  {line.n}
                                </span>
                                <span
                                  className={`select-none ${
                                    line.kind === "add"
                                      ? "text-emerald-700"
                                      : line.kind === "remove"
                                      ? "text-rose-700"
                                      : "text-stone-300"
                                  }`}
                                >
                                  {line.kind === "add"
                                    ? "+"
                                    : line.kind === "remove"
                                    ? "−"
                                    : " "}
                                </span>
                                <span className="text-stone-700 whitespace-pre">
                                  {line.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>

                <p className="mt-16 text-base italic text-stone-500 leading-relaxed">
                  This is a peek. Atlas isn&rsquo;t a code-review tool — for thorough
                  review,{" "}
                  <a className="text-amber-600 hover:underline cursor-pointer not-italic">
                    open PR #892 on GitHub
                  </a>
                  . What you see here is enough to sanity-check before approving.
                </p>
              </div>

              {/* RAIL */}
              <aside className="space-y-12">
                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Files
                  </div>
                  <ol className="mt-5 divide-y divide-stone-200">
                    {FILES.map((f) => (
                      <li key={f.path} className="py-3 group cursor-pointer">
                        <div className="font-mono text-xs text-stone-700 group-hover:text-stone-900 truncate">
                          {f.path.split("/").pop()}
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-between font-mono text-[10px]">
                          <span className="text-stone-400 truncate">
                            {f.path}
                          </span>
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-emerald-700">+{f.added}</span>
                            <span className="text-rose-700">−{f.removed}</span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="rounded-2xl bg-white/70 border border-stone-200/80 p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Approve
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    Quality gates passed on the Engine&rsquo;s machine. Approve to
                    notify carmen.
                  </p>
                  <button className="mt-5 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-emerald-600 hover:bg-emerald-700 px-4 py-3 rounded-full shadow-sm inline-flex items-center justify-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Approve &amp; ship
                    <span className="text-emerald-100">→</span>
                  </button>
                  <a className="mt-3 block text-center font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:underline cursor-pointer">
                    send back to Engine ↗
                  </a>
                </section>

                <section>
                  <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                    Checks
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Typecheck</span>
                      <span className="font-mono text-emerald-700">passing</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Lint</span>
                      <span className="font-mono text-emerald-700">clean</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Tests</span>
                      <span className="font-mono text-emerald-700">142 / 142</span>
                    </li>
                    <li className="flex items-baseline justify-between">
                      <span className="text-stone-700">Build</span>
                      <span className="font-mono text-emerald-700">passing</span>
                    </li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-stone-200/80">
                  <p className="text-sm italic text-stone-500 leading-relaxed">
                    Diff rendering is read-only · comments and review live in
                    GitHub.
                  </p>
                </section>
              </aside>
            </div>
          </main>
        </div>

        <div className="absolute bottom-8 left-20 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant KK · editorial diff viewer
        </div>
      </div>
    </>
  );
}
