/**
 * Kit — Sidebar: the canon shell rail (collapsed + expanded).
 *
 * Collapsed form ported from design/variants/variant-e-editorial-feed-first.tsx:34–107
 * (the recipe is character-identical across 32 variant files); expanded
 * form ported from variant-c-editorial.tsx:12–39 under the §2.1 T70 locks
 * (260px, sans labels, no glyphs, weight-shift active state, mono badges
 * right-aligned). Governing canon: §2.1, §3.2 (amber underline active
 * state — collapsed only), §2.10 (tooltips).
 *
 * The Bridge health dot lives on the user mark — the Bridge belongs to
 * the Owner, not the brand (F:69–71). The user mark is a bare typographic
 * letter, never a filled circle (ledger E6).
 */

export type SidebarItem = {
  key: string;
  label: string;
  /** the single nav initial shown in the collapsed rail. */
  initial: string;
  href?: string;
  active?: boolean;
  badge?: number;
  /**
   * surface not built yet — tooltip carries a stone-400 "· soon" note
   * (M6 axis; the §3.2 settings-subnav "soon" treatment, H:118–155).
   */
  soon?: boolean;
};

/**
 * "none" = no Bridge has ever been paired (M6 axis — the charter's
 * honest no-Bridge-yet state): stone-300 dot per §1.1 state-idle
 * (pending), never rose — rose means a paired Bridge went offline.
 */
export type BridgeStatus = "healthy" | "unhealthy" | "offline" | "none";

/** §2.1 — emerald healthy / amber unhealthy / rose offline (E:15–19). */
const BRIDGE_DOT: Record<BridgeStatus, string> = {
  healthy: "bg-emerald-500",
  unhealthy: "bg-amber-500",
  offline: "bg-rose-500",
  none: "bg-stone-300",
};
const BRIDGE_LABEL: Record<BridgeStatus, string> = {
  healthy: "Bridge · online · healthy",
  unhealthy: "Bridge · online · unhealthy",
  offline: "Bridge · offline",
  none: "Bridge · not set up",
};

export function Sidebar({
  items,
  user,
  bridge = "healthy",
  expanded = false,
  brandHref = "/",
  signOutSlot,
  popoverExtra,
}: {
  items: SidebarItem[];
  /** M13 axis — `machine` optional: the Bridge belongs to the Owner
   *  (§2.1), so a Collaborator's mark carries no machine line. */
  user: { initial: string; email: string; machine?: string };
  bridge?: BridgeStatus;
  /** default-collapsed below 1440px; persisted per user (§2.1). */
  expanded?: boolean;
  brandHref?: string;
  /**
   * a REAL sign-out (form posting a server action) replacing the
   * variant's dead anchor (M6 axis — M5's sign-out law).
   */
  signOutSlot?: React.ReactNode;
  /** extra popover row above sign-out (M6 — the §2.1 expand/collapse toggle). */
  popoverExtra?: React.ReactNode;
}) {
  if (expanded) {
    return (
      <aside className="w-[260px] shrink-0 px-8 pt-8 pb-6 flex flex-col gap-12">
        <div>
          <a href={brandHref} className="text-2xl font-bold tracking-tighter">
            atlas
          </a>
          {user.machine !== undefined && (
            <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${BRIDGE_DOT[bridge]}`} />
              <span className="font-mono">{user.machine}</span>
            </div>
          )}
        </div>
        <nav className="space-y-5">
          {items.map((n) => (
            <a
              key={n.key}
              href={n.href}
              className={`flex items-baseline justify-between text-sm cursor-pointer ${
                n.active
                  ? "text-stone-900 font-semibold" // §3.2 — weight shift only, no underline
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <span>{n.label}</span>
              {n.badge !== undefined && (
                <span className="font-mono text-xs text-stone-400">{n.badge}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="mt-auto text-xs text-stone-500">
          <div>{user.email}</div>
          {popoverExtra && <div className="mt-2">{popoverExtra}</div>}
          {signOutSlot ? (
            <div className="mt-2">{signOutSlot}</div>
          ) : (
            <a className="mt-2 inline-block text-stone-700 hover:underline cursor-pointer">
              sign out
            </a>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[56px] shrink-0 sticky top-0 h-screen self-start flex flex-col items-center justify-between py-8 border-r border-stone-200/60 z-10">
      {/* Brand mark — pure typographic letter, no dot (E:36–38). */}
      <a href={brandHref} className="relative h-6 w-6 flex items-center justify-center">
        <div className="text-xl font-bold tracking-tighter leading-none">a</div>
      </a>

      <nav className="flex flex-col items-center gap-5">
        {items.map((n) => (
          <a
            key={n.key}
            href={n.href}
            className={`relative h-7 w-7 flex items-center justify-center cursor-pointer transition group ${
              n.active ? "text-stone-900" : "text-stone-400 hover:text-stone-900"
            }`}
          >
            <span className={`text-base ${n.active ? "font-semibold" : "font-medium"}`}>
              {n.initial}
            </span>
            {n.active && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-3 bg-amber-500" />
            )}
            {n.badge !== undefined && (
              <span className="absolute -top-1 -right-1 font-mono text-[9px] leading-none text-stone-600 bg-amber-50 px-0.5">
                {n.badge}
              </span>
            )}
            {/* §2.10 tooltip — right side, label + mono badge meta */}
            <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-stone-50 opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-md">
              {n.label}
              {n.badge !== undefined && <span className="text-stone-400"> · {n.badge}</span>}
              {n.soon && <span className="text-stone-400"> · soon</span>}
            </span>
          </a>
        ))}
      </nav>

      {/* User mark — bare letter + Bridge dot + hover popover (E:74–105). */}
      <div className="relative group">
        <div className="relative h-6 w-6 flex items-center justify-center cursor-pointer">
          <div className="text-xl font-bold tracking-tighter leading-none text-stone-900 group-hover:text-amber-600 transition">
            {user.initial}
          </div>
          <span
            className={`absolute right-0 top-0 inline-block h-1.5 w-1.5 rounded-full ${BRIDGE_DOT[bridge]}`}
          />
        </div>
        <div className="absolute left-full bottom-0 ml-3 w-60 bg-white rounded-2xl shadow-lg border border-stone-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none group-hover:pointer-events-auto transition z-30">
          <div className="text-sm text-stone-900 break-all leading-tight">{user.email}</div>
          <hr className="my-4 border-stone-200" />
          {user.machine !== undefined && (
            <>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${BRIDGE_DOT[bridge]}`} />
                {BRIDGE_LABEL[bridge]}
              </div>
              <div className="mt-1 font-mono text-[10px] text-stone-400">{user.machine}</div>
              <hr className="my-4 border-stone-200" />
            </>
          )}
          {popoverExtra && (
            <>
              {popoverExtra}
              <hr className="my-4 border-stone-200" />
            </>
          )}
          {signOutSlot ?? (
            <a className="block font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
              Sign out →
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
