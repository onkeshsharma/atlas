/**
 * M10 — the Settings 3-pane shell (canon §4-M10: `[200px_1fr_360px]`,
 * §3.2 vertical-subnav active state, content sections `mt-16/20 pb-14
 * border-b`).
 *
 * Ported from design/variants/variant-h-settings.tsx:110–157 (breadcrumb
 * row, grid, sub-nav recipe) — the same pane skeleton N/BB/CC repeat
 * byte-for-byte. Sanctioned deviations (recorded in HANDOFF-M10):
 * the variants' "Billing · soon" sub-nav row is DROPPED (no billing
 * exists in the v2.0 PRD — honesty bar beats a perpetual "soon");
 * Tokens + Profile rows are ADDED because those settings pages are real
 * (XX/QQ are standalone-subnav pages, but the tier needs one index).
 */
import Link from "next/link";

export type SettingsSection =
  | "preferences"
  | "bridges"
  | "account"
  | "notifications"
  | "tokens"
  | "profile"
  | "people"
  | "audit";

const SUB_NAV: Array<{ key: SettingsSection; label: string; href: string }> = [
  { key: "bridges", label: "Bridges", href: "/settings/bridges" },
  { key: "preferences", label: "Preferences", href: "/settings" },
  { key: "account", label: "Account", href: "/settings/account" },
  { key: "notifications", label: "Notifications", href: "/settings/notifications" },
  { key: "tokens", label: "Tokens", href: "/settings/tokens" },
  { key: "profile", label: "Profile", href: "/settings/profile" },
  // M11 (sanctioned subnav extension — charter item 3): People + Audit
  // are standalone-subnav pages (WW/TT), indexed here like Tokens/Profile.
  { key: "people", label: "People", href: "/settings/people" },
  { key: "audit", label: "Audit log", href: "/settings/audit" },
];

export function SettingsSubnav({
  active,
  bridgeBadge,
}: {
  active: SettingsSection;
  /** the H:18 "Bridges · 1" mono badge — the REAL paired count. */
  bridgeBadge?: number;
}) {
  return (
    <nav className="space-y-1">
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500 pb-3 border-b border-stone-200">
        Settings
      </div>
      <div className="pt-3 space-y-1">
        {SUB_NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`group flex items-baseline justify-between py-2 cursor-pointer transition ${
                isActive ? "text-stone-900" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span
                className={`relative text-sm tracking-tight ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 h-[2px] w-6 bg-amber-500" />
                )}
              </span>
              {item.key === "bridges" && bridgeBadge !== undefined && bridgeBadge > 0 && (
                <span className="font-mono text-[10px] text-stone-500">{bridgeBadge}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** H:110–116 — main column + breadcrumb + the 3-pane grid. */
export function SettingsShell({
  breadcrumb,
  active,
  bridgeBadge,
  rail,
  children,
}: {
  /** mono breadcrumb — "Settings · Preferences" (H:112). */
  breadcrumb: string;
  active: SettingsSection;
  bridgeBadge?: number;
  /** the 360 rail (H:249, space-y-14). */
  rail: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 px-16 pt-8 pb-24">
      <div className="text-xs text-stone-500 font-mono uppercase tracking-widest">
        {breadcrumb}
      </div>
      <div className="mt-8 grid grid-cols-[200px_1fr_360px] gap-16">
        <SettingsSubnav active={active} bridgeBadge={bridgeBadge} />
        <div className="max-w-2xl">{children}</div>
        <aside className="space-y-14">{rail}</aside>
      </div>
    </main>
  );
}
