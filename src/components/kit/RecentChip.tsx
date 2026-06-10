/**
 * Kit — RecentChip: quiet recall chip (palette "recent" row).
 *
 * Ported from design/variants/variant-uu-cmdk.tsx:105–112.
 * Governing canon: §2.12.
 */

export function RecentChip({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className =
    "px-2.5 py-1 rounded-full bg-stone-100 text-xs text-stone-700 hover:bg-stone-200 cursor-pointer transition";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
