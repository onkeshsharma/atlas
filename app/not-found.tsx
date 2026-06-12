/**
 * M15 — the ROOT not-found boundary (PRD #56; charter item 1): unmatched
 * URLs for the whole app + notFound() from the layout-less (public)
 * group (M14: /docs/[slug] unknown slugs). Interior = the variant X port
 * in src/components/system/NotFoundEditorial.tsx (citations + deviations
 * there).
 *
 * This boundary renders inside the ROOT layout only — no (app) shell —
 * so for signed-in users it re-composes the real shell rail exactly as
 * app/(app)/layout.tsx does (kept inline rather than extracted because
 * M13 is expected to touch that layout — parallel-safety beats DRY this
 * round). X:13–44 draws the rail with NOTHING active ("we're nowhere");
 * AppSidebar derives active-from-pathname, and a 404 path matches no
 * item. Signed-out visitors get NO rail (HANDOFF-M14 decision 1: public
 * surfaces never fake the authed shell or leak instance state).
 *
 * In-group notFound() never reaches here — app/(app)/not-found.tsx is
 * the closer boundary (the (app) layout stays mounted there; proven in
 * e2e/m15-system.spec.ts).
 */
import { AppSidebar } from "@/src/components/shell/AppSidebar";
import { type SidebarItem } from "@/src/components/kit";
import { NotFoundEditorial } from "@/src/components/system/NotFoundEditorial";
import { signOutAction } from "@/src/domain/auth/actions";
import { getCurrentUser } from "@/src/domain/auth/current-user";
import { bridgePresence } from "@/src/domain/bridge/status";
import { heroCounts } from "@/src/domain/cockpit/queries";
import { unreadCount } from "@/src/domain/feed/queries";
import { sidebarCollapsed } from "@/src/domain/preferences/sidebar";

import { toggleSidebarAction } from "./(app)/actions";

export default async function NotFound() {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen">
      {user?.role && <NotFoundSidebar />}
      <NotFoundEditorial />
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
