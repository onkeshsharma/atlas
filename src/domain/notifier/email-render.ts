/**
 * M13 — the mail-safe rendering vocabulary for AA/YY (canon §4-M13).
 *
 * Email clients have no Tailwind and no <style> guarantees, so the
 * Notifier renders the §4-M13 recipe as INLINE-STYLED static HTML — no
 * client JS, no external CSS (charter item 6). Every constant below is
 * the exact value of the Tailwind class the variant draws, cited; the
 * kit's EmailShell/EmailStat (canon §5 #28) remain the app-side
 * primitives — this module is the same design in the medium mail
 * actually renders, and /dev-emails previews THIS output (the delivery
 * truth), not a parallel React tree.
 *
 * Semi-transparent washes are flattened to their composited hex so mail
 * clients see one opaque color (mail has no reliable alpha stacking):
 *   shell  bg-amber-50/40 over bg-stone-100 canvas (AA:9+30) → #f9f7f0
 *   footer bg-stone-50/60 over the shell wash (AA:144)       → #faf9f5
 *   stat   bg-white/60 over the shell wash (YY:223)          → #fcfbf6
 */

export const FONT_SANS =
  "Geist, 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const FONT_MONO =
  "'Geist Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

/** Tailwind stock steps the §1.1 tokens resolve to (canon: stock palette only). */
export const INK = {
  stone900: "#1c1917",
  stone700: "#44403c",
  stone600: "#57534e",
  stone500: "#78716c",
  stone400: "#a8a29e",
  stone300: "#d6d3d1",
  stone200: "#e7e5e4",
  stone100: "#f5f5f4",
  stone50: "#fafaf9",
  amber500: "#f59e0b",
  amber600: "#d97706",
  amber700: "#b45309",
  amber100_70: "#fef3da", // amber-100/70 over the shell wash (YY:256)
  emerald400_80: "#5edba8", // emerald-400/80 (AA:75) flattened over the shell wash
  emerald600: "#059669",
  emerald700: "#047857",
  canvas: "#f5f5f4", // bg-stone-100 (AA:9, YY:10)
  shell: "#f9f7f0", // bg-amber-50/40 over the canvas (AA:30, YY:57)
  shellFooter: "#faf9f5", // bg-stone-50/60 over the shell (AA:144)
  headerCard: "#ffffff", // YY:25 mail-headers card
  statCard: "#fcfbf6", // bg-white/60 over the shell (YY:223)
  white: "#ffffff",
} as const;

/** mono-meta — font-mono text-[10px] uppercase tracking-widest (§1.2). */
export function monoMeta(color: string): string {
  return `font-family:${FONT_MONO};font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:${color};`;
}

/** mono text-xs uppercase tracking-widest — pill labels, header rows (§1.2/§2.9). */
export function monoSmall(color: string): string {
  return `font-family:${FONT_MONO};font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${color};`;
}

/** mono-section — text-xs tracking-[0.25em] (§2.5). */
export function monoSection(color: string): string {
  return `font-family:${FONT_MONO};font-size:12px;text-transform:uppercase;letter-spacing:0.25em;color:${color};`;
}

/** body prose — text-base leading-relaxed (§1.2). */
export function bodyProse(color: string): string {
  return `font-family:${FONT_SANS};font-size:16px;line-height:1.625;color:${color};margin:0;`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** §2.9 pill buttons, mail-safe (a-tag, rounded-full, mono label). */
export function pillLink(opts: {
  href: string;
  label: string;
  kind: "primary" | "secondary";
  trailing?: string;
}): string {
  const base = `display:inline-block;border-radius:9999px;text-decoration:none;font-family:${FONT_MONO};font-size:12px;text-transform:uppercase;letter-spacing:0.1em;padding:12px 20px;`;
  const skin =
    opts.kind === "primary"
      ? `background:${INK.stone900};color:${INK.stone50};` // AA:96 (sans the dot — §2.9 strict-dot: inline pill)
      : `background:${INK.white};color:${INK.stone700};border:1px solid ${INK.stone200};`; // AA:101
  const trailing = opts.trailing
    ? ` <span style="color:${opts.kind === "primary" ? INK.stone400 : INK.stone400};">${opts.trailing}</span>`
    : "";
  return `<a href="${escapeHtml(opts.href)}" style="${base}${skin}">${escapeHtml(opts.label)}${trailing}</a>`;
}

/**
 * The email document: stone-100 canvas, centred max-w-2xl shell with
 * rounded-2xl border + the AA/YY header-rows-as-stationery (the
 * variants draw from/to/subj INSIDE the card — EmailShell ports the
 * same rows, so they are design, not client chrome; recorded in
 * HANDOFF-M13 for an Onkesh ruling). `headerHtml`/`footerHtml` are the
 * per-kind stationery; `bodyHtml` is the article.
 */
export function emailDocument(opts: {
  title: string;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
}): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${INK.canvas};">
  <div style="background:${INK.canvas};padding:48px 24px;">
    <!-- AA:30 — max-w-2xl shell, rounded-2xl, border-stone-200; shadow-lg approximated (many clients drop box-shadow; the border carries the edge) -->
    <div style="max-width:672px;margin:0 auto;background:${INK.shell};border:1px solid ${INK.stone200};border-radius:16px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);">
      ${opts.headerHtml}
      ${opts.bodyHtml}
      ${opts.footerHtml}
    </div>
  </div>
</body>
</html>`;
}

/** AA:32–56 — the from/to/subj stationery rows. */
export function shipHeader(opts: { fromName: string; fromAddress: string; to: string; subject: string }): string {
  const row = (label: string, valueHtml: string) =>
    `<tr><td style="${monoSmall(INK.stone400)}width:48px;padding:0 0 8px 0;vertical-align:baseline;">${label}</td><td style="padding:0 0 8px 12px;vertical-align:baseline;">${valueHtml}</td></tr>`;
  return `<div style="padding:40px 40px 24px 40px;border-bottom:1px solid ${INK.stone200};">
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${row(
        "from",
        `<span style="${monoSmall(INK.stone900)}">${escapeHtml(opts.fromName)} <span style="font-family:${FONT_SANS};font-size:12px;text-transform:none;letter-spacing:normal;color:${INK.stone400};">&lt;${escapeHtml(opts.fromAddress)}&gt;</span></span>`,
      )}
      ${row(
        "to",
        `<span style="font-family:${FONT_MONO};font-size:12px;color:${INK.stone900};">${escapeHtml(opts.to)}</span>`,
      )}
      ${row(
        "subj",
        `<span style="font-family:${FONT_SANS};font-size:14px;color:${INK.stone900};">${escapeHtml(opts.subject)}</span>`,
      )}
    </table>
  </div>`;
}

/** AA:144–155 — quiet Atlas footer with the prefs link. */
export function shipFooter(opts: { prefsUrl: string | null }): string {
  const link = opts.prefsUrl
    ? `<a href="${escapeHtml(opts.prefsUrl)}" style="${monoMeta(INK.stone500)}text-decoration:none;">unsubscribe</a>`
    : "";
  return `<div style="padding:24px 40px;background:${INK.shellFooter};border-top:1px solid ${INK.stone200};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="${monoMeta(INK.stone500)}"><span style="color:${INK.stone900};font-weight:700;">atlas</span><span style="padding:0 8px;">·</span>a quiet portal for the work your Engine does</td>
      <td align="right" style="${monoMeta(INK.stone500)}">${link}</td>
    </tr></table>
  </div>`;
}
