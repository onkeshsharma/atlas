/**
 * M15 — the editorial 404 interior (variant X port), shared by BOTH
 * not-found boundaries:
 *  - app/not-found.tsx (root) — unmatched URLs + public-group
 *    notFound(); adds its own shell rail for signed-in users.
 *  - app/(app)/not-found.tsx — in-group notFound() keeps the (app)
 *    layout MOUNTED (proven in e2e: the shell rail stays), so that
 *    boundary renders this interior alone.
 *
 * Ported from design/variants/variant-x-404.tsx:46–121 (404 kicker ·
 * text-7xl "Not here." hero · honest prose · "Where you might want to
 * be" divided list · italic outro · mono "Tried:" detail).
 *
 * Sanctioned deviations (full audit in notes/M15-manual-test.md):
 *  - X:56 `leading-[0.95]` → `leading-none` — canon §1.2 display-xl.
 *  - X:74 "Your dashboard" → "Today." (Owner) / "Your inbox"
 *    (Collaborator) — CONTEXT.md naming law: never "dashboard" in copy.
 *  - Visitors get the public destinations (landing · docs · status) —
 *    the app rows would all bounce them to /sign-in.
 *  - X:96–103 "Ask the Owner · message ↗" renders for Collaborators
 *    only, as a real mailto (M14 ask-a-human precedent). The Owner
 *    never sees it — messaging yourself is a fake affordance.
 *  - X:108–112 outro: the "please file a Ticket" clause holds only for
 *    audiences that can file; visitors get it without the clause.
 *  - X:126 colophon = design-lab artifact, never ported (canon §4 note).
 */
import Link from "next/link";

import { MonoSectionLabel } from "@/src/components/kit";
import { TriedPath } from "@/src/components/system/TriedPath";
import { getCurrentUser } from "@/src/domain/auth/current-user";
import { ownerEmail } from "@/src/domain/people/queries";

type Row = { label: string; affordance: string; href: string; external?: boolean };

export async function NotFoundEditorial() {
  const user = await getCurrentUser();
  const audience = user?.role ?? "visitor";

  // X's divided rows, resolved to REAL destinations per audience.
  let rows: Row[];
  if (audience === "owner") {
    rows = [
      { label: "Today.", affordance: "go home →", href: "/today" },
      { label: "Open a Project", affordance: "pick one →", href: "/projects" },
      {
        label: "File a Ticket about this broken link",
        affordance: "file →",
        href: "/tickets/new",
      },
    ];
  } else if (audience === "collaborator") {
    const owner = await ownerEmail();
    rows = [
      { label: "Your inbox", affordance: "go home →", href: "/inbox" },
      {
        label: "File a Ticket about this broken link",
        affordance: "file →",
        href: "/tickets/new",
      },
      ...(owner
        ? [
            {
              label: "Ask the Owner",
              affordance: "message ↗",
              href: `mailto:${owner}`,
              external: true,
            },
          ]
        : []),
    ];
  } else {
    rows = [
      { label: "The landing page", affordance: "go home →", href: "/" },
      { label: "The docs", affordance: "read them →", href: "/docs" },
      { label: "Status", affordance: "check it →", href: "/status" },
    ];
  }

  return (
    <main className="flex-1 flex items-center px-16 pt-8 pb-24">
      <div className="max-w-2xl">
        {/* The status code as a quiet day-stamp (X:50–52) */}
        <div className="font-mono text-xs uppercase tracking-widest text-stone-500">
          404 · Not found
        </div>

        {/* X:54–58 — biggest hero we use, no period this time (the page
            is honest about being incomplete). canon §1.2: display-xl is
            leading-none (X's leading-[0.95] folds). */}
        <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-none">
          Not here.
        </h1>

        {/* Honest explanation in editorial prose (X:60–64) */}
        <p className="mt-7 text-xl text-stone-700 leading-relaxed">
          This page doesn&rsquo;t exist — or it did and got renamed, or you
          don&rsquo;t have access to it. Atlas isn&rsquo;t sure which.
        </p>

        {/* What you can do — divided list (X:66–105) */}
        <section className="mt-16">
          <MonoSectionLabel>Where you might want to be</MonoSectionLabel>
          <ul className="mt-5 divide-y divide-stone-200">
            {rows.map((row) =>
              row.external ? (
                <li key={row.href} className="group">
                  <a
                    href={row.href}
                    className="py-3 flex items-baseline justify-between cursor-pointer"
                  >
                    <span className="text-base text-stone-700 group-hover:text-stone-900">
                      {row.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                      {row.affordance}
                    </span>
                  </a>
                </li>
              ) : (
                <li key={row.href} className="group">
                  <Link
                    href={row.href}
                    className="py-3 flex items-baseline justify-between cursor-pointer"
                  >
                    <span className="text-base text-stone-700 group-hover:text-stone-900">
                      {row.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
                      {row.affordance}
                    </span>
                  </Link>
                </li>
              ),
            )}
          </ul>
        </section>

        {/* Quiet outro — honest, not apologetic (X:107–112) */}
        <p className="mt-16 text-sm italic text-stone-500 leading-relaxed">
          {audience === "visitor" ? (
            <>
              If you got here by clicking a link inside Atlas, that&rsquo;s our
              bug. If you typed the URL, no harm done.
            </>
          ) : (
            <>
              If you got here by clicking a link inside Atlas, that&rsquo;s our
              bug — please file a Ticket so we can fix it. If you typed the
              URL, no harm done.
            </>
          )}
        </p>

        {/* Mono detail at the very bottom (X:114–120) — the real path */}
        <TriedPath />
      </div>
    </main>
  );
}
