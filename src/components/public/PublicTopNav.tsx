/**
 * M14 — the public tier's shared top chrome.
 *
 * Ported from design/variants/variant-ff-landing.tsx:10–20 (landing),
 * variant-mm-status.tsx:69–75 (status) and variant-nn-changelog.tsx:91–98
 * (changelog): mono wordmark top-left, quiet mono links top-right — the
 * same corner-chrome idiom the M5 pre-auth surfaces use (canon §4-M5).
 * Surface-level shared component (the M9 `src/components/run/` precedent),
 * not a kit primitive.
 */
import Link from "next/link";

export function PublicTopNav({
  surface,
  links,
}: {
  /** "status" / "changelog" — renders "Atlas · {surface}" with the
   * wordmark linking home (MM:70 / NN:92). Omit on the landing itself,
   * where "Atlas" stands alone (FF:10–12). */
  surface?: string;
  links: React.ReactNode;
}) {
  return (
    <>
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        {surface ? (
          <>
            <Link href="/" className="hover:text-stone-900 cursor-pointer">
              Atlas
            </Link>{" "}
            · {surface}
          </>
        ) : (
          "Atlas"
        )}
      </div>
      <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
        {links}
      </div>
    </>
  );
}

/** quiet top-right link (FF:14–16). `emphasis` = FF:17–19's sign-in form. */
export function TopNavLink({
  href,
  emphasis = false,
  children,
}: {
  href: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        emphasis
          ? "text-stone-900 hover:text-amber-600 cursor-pointer underline-offset-4 hover:underline"
          : "hover:text-stone-900 cursor-pointer"
      }
    >
      {children}
    </Link>
  );
}
