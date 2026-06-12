/**
 * M6 — the authed app shell (canon §2.1).
 *
 * Shell skeleton ported from design/variants/variant-e-editorial-feed-first.tsx:31
 * (`flex min-h-screen` over the collapsed rail); the warm wash is already
 * on the root layout — never re-applied here (M4 handoff law).
 *
 * Bridge status renders the honest no-Bridge-yet state ("none", stone-300
 * per §1.1 state-idle) — no Bridge exists until M9/M10. Nav badges are
 * real counts; surfaces that don't exist yet are marked `soon` (§3.2's
 * settings-subnav "soon" treatment) and carry no href.
 */
import { redirect } from "next/navigation";

import { heroCounts } from "@/src/domain/cockpit/queries";
import { signOutAction } from "@/src/domain/auth/actions";
import { requireUser } from "@/src/domain/auth/guard";
import { bridgePresence } from "@/src/domain/bridge/status";
import { unreadCount } from "@/src/domain/feed/queries";
import { sidebarCollapsed } from "@/src/domain/preferences/sidebar";
import { AppSidebar } from "@/src/components/shell/AppSidebar";
import { PaletteMount } from "@/src/components/search/PaletteMount";
import type { SidebarItem } from "@/src/components/kit";

import { toggleSidebarAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.role) redirect("/no-access");

  // M9 — the sidebar BridgeStatus goes live from the heartbeat (the one
  // sanctioned shell touch — charter §4).
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
    // Board is real (M8); Projects (M7) and Settings (M10) are real.
    {
      key: "board",
      label: "Board",
      initial: "B",
      href: "/board",
      badge: counts.triage > 0 ? counts.triage : undefined,
    },
    // M7 — Projects is real (charter §4: this line only; M8 claims Board).
    { key: "projects", label: "Projects", initial: "P", href: "/projects" },
    { key: "settings", label: "Settings", initial: "S", href: "/settings" }, // M10 — real (charter §2: this line only)
  ];

  const initial =
    user.membership?.initial ??
    (user.membership?.displayName ?? user.name ?? "o").charAt(0).toLowerCase();

  return (
    <div className="flex min-h-screen">
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
          // C:37 — the expanded rail's sign-out is plain sans, hover underline
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
      {children}
      {/* M12 — the global ⌘K palette, mounted ONCE (charter §2: this line
          only; no Search nav item — no variant draws one, the palette is
          the entry). Owner-only until M13 re-derives Collaborator nav. */}
      {user.role === "owner" && <PaletteMount />}
    </div>
  );
}
