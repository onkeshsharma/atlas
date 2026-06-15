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
import { collabUnreadCount } from "@/src/domain/collab/queries";
import { unreadCount } from "@/src/domain/feed/queries";
import { sidebarCollapsed } from "@/src/domain/preferences/sidebar";
import { afkLevel } from "@/src/domain/settings/instance";
import { athenaDecisionCount } from "@/src/domain/athena/activity";
import { AfkChip } from "@/src/components/shell/AfkChip";
import { AppSidebar } from "@/src/components/shell/AppSidebar";
import { PaletteMount } from "@/src/components/search/PaletteMount";
import type { SidebarItem } from "@/src/components/kit";

import { toggleSidebarAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.role) redirect("/no-access");

  // M13 — role-derived nav: the Collaborator's Atlas is their scoped
  // surfaces (Inbox + their Tickets + their notification prefs); Owner
  // pages would only bounce them through guards. Their inbox badge is
  // the per-user mark over visible projects, never the Owner's count.
  const isCollab = user.role === "collaborator";

  // M9 — the sidebar BridgeStatus goes live from the heartbeat (the one
  // sanctioned shell touch — charter §4).
  const [unread, counts, collapsed, bridge] = await Promise.all([
    isCollab ? collabUnreadCount(user.id) : unreadCount(),
    isCollab ? null : heroCounts(),
    sidebarCollapsed(user.id),
    bridgePresence(),
  ]);

  // ADR-0007 §6 — the AFK active chip (Owner only; only when AFK isn't off).
  const afkLvl = isCollab ? "off" : await afkLevel();
  let afkCount = 0;
  if (afkLvl !== "off") {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    afkCount = await athenaDecisionCount(since.getTime());
  }

  const items: SidebarItem[] = isCollab
    ? [
        {
          key: "inbox",
          label: "Inbox",
          initial: "I",
          href: "/inbox",
          badge: unread > 0 ? unread : undefined,
        },
        // T's own sidebar mock highlights a projects-tier item (T:114) —
        // v2's collab project surface IS the tickets view (/tickets).
        { key: "tickets", label: "Tickets", initial: "T", href: "/tickets" },
        { key: "notifications", label: "Notifications", initial: "N", href: "/settings/notifications" },
      ]
    : [
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
          badge: counts && counts.triage > 0 ? counts.triage : undefined,
        },
        // M7 — Projects is real (charter §4: this line only; M8 claims Board).
        { key: "projects", label: "Projects", initial: "P", href: "/projects" },
        { key: "settings", label: "Settings", initial: "S", href: "/settings" }, // M10 — real (charter §2: this line only)
        // M17 — Activity Monitor (Owner-only operational surface). Nav decision:
        // a dedicated nav item is warranted because the monitor is the ONLY place
        // to see per-session resource telemetry + act on runaway/stuck sessions;
        // reaching it only via Today would bury the runaway signal below the fold.
        { key: "activity", label: "Activity", initial: "A", href: "/activity" },
      ];

  const initial =
    user.membership?.initial ??
    (user.membership?.displayName ?? user.name ?? "o").charAt(0).toLowerCase();

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        items={items}
        // M13 — the Bridge belongs to the Owner (§2.1); a Collaborator's
        // mark carries no bridge dot and no machine line.
        user={{ initial, email: user.email, machine: isCollab ? undefined : bridge.machine }}
        bridge={isCollab ? "none" : bridge.status}
        brandHref={isCollab ? "/inbox" : "/today"}
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
      {afkLvl !== "off" && <AfkChip level={afkLvl} count={afkCount} />}
      {/* M12 — the global ⌘K palette, mounted ONCE (charter §2: this line
          only; no Search nav item — no variant draws one, the palette is
          the entry). Owner-only until M13 re-derives Collaborator nav. */}
      {user.role === "owner" && <PaletteMount />}
    </div>
  );
}
