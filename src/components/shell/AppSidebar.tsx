"use client";
/**
 * M6 — the authed shell's sidebar: a thin client wrapper that derives
 * the active nav item from the current pathname and renders the kit
 * Sidebar (canon §2.1 / §3.2 — composition only, no local styling).
 * The sign-out + collapse-toggle slots are server-action forms passed
 * down from the layout.
 */
import { usePathname } from "next/navigation";

import { Sidebar, type BridgeStatus, type SidebarItem } from "@/src/components/kit";

export function AppSidebar({
  items,
  user,
  bridge,
  expanded,
  brandHref = "/today",
  signOutSlot,
  expandedSignOutSlot,
  popoverExtra,
}: {
  items: SidebarItem[];
  /** M13 — `machine` optional (kit axis: the Bridge belongs to the Owner, §2.1). */
  user: { initial: string; email: string; machine?: string };
  bridge: BridgeStatus;
  expanded: boolean;
  /** M13 — the brand mark lands on the role's home (Collaborators: /inbox). */
  brandHref?: string;
  /** popover form — mono "Sign out →" (E:102). */
  signOutSlot?: React.ReactNode;
  /** expanded-rail form — plain-sans "sign out" hover:underline (C:37). */
  expandedSignOutSlot?: React.ReactNode;
  popoverExtra?: React.ReactNode;
}) {
  const pathname = usePathname();
  const withActive = items.map((n) => ({
    ...n,
    active: n.href ? pathname === n.href || pathname.startsWith(`${n.href}/`) : false,
  }));

  if (!expanded) {
    return (
      <Sidebar
        items={withActive}
        user={user}
        bridge={bridge}
        brandHref={brandHref}
        signOutSlot={signOutSlot}
        popoverExtra={popoverExtra}
      />
    );
  }

  // §2.1 — the expanded preference holds at ≥1440px only; below it the
  // shell falls back to the collapsed rail (default-collapsed lock).
  return (
    <>
      <div className="hidden min-[1440px]:contents">
        <Sidebar
          items={withActive}
          user={user}
          bridge={bridge}
          expanded
          brandHref={brandHref}
          signOutSlot={expandedSignOutSlot ?? signOutSlot}
          popoverExtra={popoverExtra}
        />
      </div>
      <div className="contents min-[1440px]:hidden">
        <Sidebar
          items={withActive}
          user={user}
          bridge={bridge}
          brandHref={brandHref}
          signOutSlot={signOutSlot}
          popoverExtra={popoverExtra}
        />
      </div>
    </>
  );
}
