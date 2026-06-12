/**
 * M15 — the editorial 404 (PRD #56; charter item 1).
 *
 * Ported from design/variants/variant-x-404.tsx:46–121 (404 kicker ·
 * text-7xl "Not here." hero · honest prose · "Where you might want to be"
 * divided list · italic outro · mono "Tried:" detail). One boundary serves
 * every miss: unmatched URLs and every notFound() in the tree (M14:
 * /docs/[slug] unknown slugs land here too).
 *
 * The root not-found boundary renders inside the root layout ONLY — the
 * (app) shell never wraps it — so for signed-in users this page
 * re-composes the real shell sidebar exactly as app/(app)/layout.tsx does
 * (cited there; kept inline rather than extracted because M13 is expected
 * to touch that layout — parallel-safety beats DRY this round). X:13–44
 * draws the rail with NOTHING active ("we're nowhere"); AppSidebar derives
 * active-from-pathname, and a 404 path matches no nav item.
 *
 * Sanctioned deviations (full audit in notes/M15-manual-test.md):
 *  - X:56 `leading-[0.95]` → `leading-none` — canon §1.2 display-xl.
 *  - X:74 "Your dashboard" → "Today." (Owner) / "Your inbox"
 *    (Collaborator) — CONTEXT.md naming law: never "dashboard" in copy.
 *  - Signed-out visitors get NO sidebar (HANDOFF-M14 decision 1: public
 *    surfaces never fake the authed shell or leak instance state) and the
 *    public destinations — landing · docs · status — as their rows.
 *  - X:96–103 "Ask the Owner · message ↗" renders for Collaborators only,
 *    as a real mailto (M14 ask-a-human precedent). The Owner never sees
 *    it — messaging yourself is a fake affordance.
 *  - X:108–112 outro: the "please file a Ticket" clause holds only for
 *    audiences that can file; visitors get the same sentence without it.
 *  - X:126 colophon = design-lab artifact, never ported (canon §4 note).
 */
import Link from "next/link";

import { AppSidebar } from "@/src/components/shell/AppSidebar";
import { MonoSectionLabel, type SidebarItem } from "@/src/components/kit";
import { TriedPath } from "@/src/components/system/TriedPath";
import { signOutAction } from "@/src/domain/auth/actions";
import { getCurrentUser } from "@/src/domain/auth/current-user";
import { bridgePresence } from "@/src/domain/bridge/status";
import { heroCounts } from "@/src/domain/cockpit/queries";
import { unreadCount } from "@/src/domain/feed/queries";
import { ownerEmail } from "@/src/domain/people/queries";
import { sidebarCollapsed } from "@/src/domain/preferences/sidebar";

import { toggleSidebarAction } from "./(app)/actions";

type Row = { label: string; affordance: string; href: string; external?: boolean };

export default async function NotFound() {
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
    <div className="flex min-h-screen">
      {audience !== "visitor" && <NotFoundSidebar />}

      {/* MAIN — single centred editorial moment (X:46–48) */}
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
    </div>
  );
}

/**
 * The real shell rail for signed-in misses — same composition as
 * app/(app)/layout.tsx (kept in lockstep by hand; see file header).
 */
async function NotFoundSidebar() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [unread, counts, collapsed, bridge] = await Promise.all([
    unreadCount(),
    heroCounts(),
    sidebarCollapsed(user.id),
    bridgePresence(),
  ]);

  const items: SidebarItem[] = [
    { key: "today", label: "Today", initial: "T", href: "/today" },
    {
      key: "inbox",
      label: "Inbox",
      initial: "I",
      href: "/inbox",
      badge: unread > 0 ? unread : undefined,
    },
    {
      key: "board",
      label: "Board",
      initial: "B",
      href: "/board",
      badge: counts.triage > 0 ? counts.triage : undefined,
    },
    { key: "projects", label: "Projects", initial: "P", href: "/projects" },
    { key: "settings", label: "Settings", initial: "S", href: "/settings" },
  ];

  const initial =
    user.membership?.initial ??
    (user.membership?.displayName ?? user.name ?? "o").charAt(0).toLowerCase();

  return (
    <AppSidebar
      items={items}
      user={{ initial, email: user.email, machine: bridge.machine }}
      bridge={bridge.status}
      expanded={!collapsed}
      signOutSlot={
        <form action={signOutAction}>
          <button
            type="submit"
            className="block font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
          >
            Sign out →
          </button>
        </form>
      }
      expandedSignOutSlot={
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-block text-stone-700 hover:underline cursor-pointer"
          >
            sign out
          </button>
        </form>
      }
      popoverExtra={
        <form action={toggleSidebarAction}>
          <button
            type="submit"
            className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-600 cursor-pointer"
          >
            {collapsed ? "Expand sidebar →" : "Collapse sidebar →"}
          </button>
        </form>
      }
    />
  );
}
