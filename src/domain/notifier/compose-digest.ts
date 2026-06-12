/**
 * M13 — the Weekly Digest composer (PRD #45; variant YY).
 *
 * Per-Collaborator: their visible projects' week (THE GUARD's scope —
 * `visibleProjectIds` feeds the inputs upstream in process.ts). Honest
 * prose only: ship bodies quote the ticket's own story (the reporter's
 * words) or state the real change size — never invented narration.
 * Markup per YY via email-render.ts; YY's mail-headers card (YY:25–54)
 * is the digest's stationery, the rounded-b footer (YY:196–203) closes
 * it.
 */
import {
  FONT_MONO,
  FONT_SANS,
  INK,
  bodyProse,
  emailDocument,
  escapeHtml,
  monoMeta,
  monoSection,
  pillLink,
} from "./email-render";
import type { ComposedEmail } from "./compose-ship";

export type DigestShipItem = {
  ticketRef: string;
  title: string;
  /** honest body — the ticket's own story lede, or the change-size sentence. */
  body: string;
  /** "Ticket T-249 · shipped Tue · PR #142" — composed from real refs. */
  meta: string;
  /** the recipient filed it (YY:255's "from you" badge). */
  fromYou: boolean;
};

export type DigestEmailInput = {
  recipientName: string;
  recipientEmail: string;
  ownerName: string;
  /** the recipient's visible projects covered by this digest. */
  projectNames: string[];
  /** YY:72 — "Week 24 · Jun 1 → 7" (gate.digestWindowLabel). */
  windowLabel: string;
  ships: DigestShipItem[];
  /** tickets filed in the window across their projects. */
  openedCount: number;
  /** currently review-ready in their projects. */
  inReview: Array<{ ticketRef: string; title: string }>;
  appUrl: string | null;
  fromAddress: string;
};

/** YY:43 — the subject; project-named when the scope is one project. */
export function digestSubject(input: { ships: number; projectNames: string[] }): string {
  const n = input.ships;
  const things = `${n} thing${n === 1 ? "" : "s"}`;
  if (input.projectNames.length === 1)
    return `${things} shipped on ${input.projectNames[0]} this week`;
  return `${things} shipped across your projects this week`;
}

/** YY:50 — the preview line; names their own ship when one exists. */
export function digestPreview(input: { ships: DigestShipItem[] }): string {
  const yours = input.ships.find((s) => s.fromYou);
  if (yours) return `Including “${yours.title}” — the one you filed.`;
  if (input.ships.length > 0) return `${input.ships[0].title} and more.`;
  return "A quiet week on your projects.";
}

export function composeDigestEmail(input: DigestEmailInput): ComposedEmail {
  const subject = digestSubject({ ships: input.ships.length, projectNames: input.projectNames });
  const preview = digestPreview(input);
  const scope =
    input.projectNames.length === 1 ? input.projectNames[0] : `${input.projectNames.length} projects`;
  const prefsUrl = input.appUrl ? `${input.appUrl}/settings/notifications` : null;
  const atlasUrl = input.appUrl;

  // ── text/plain ──
  const text = [
    `Morning, ${input.recipientName}.`,
    ``,
    `${input.ownerName} shipped ${input.ships.length} change${input.ships.length === 1 ? "" : "s"} on ${scope} last week.`,
    ``,
    `WHAT SHIPPED`,
    ...(input.ships.length
      ? input.ships.flatMap((s, i) => [
          `${String(i + 1).padStart(2, "0")}. ${s.title}${s.fromYou ? "  [from you]" : ""}`,
          `    ${s.body}`,
          `    ${s.meta}`,
        ])
      : [`Nothing shipped this week.`]),
    ``,
    `STILL IN REVIEW`,
    ...(input.inReview.length
      ? input.inReview.map((r) => `- ${r.title} (${r.ticketRef})`)
      : [`Nothing waiting on review.`]),
    ``,
    `Filed this week across your projects: ${input.openedCount}`,
    ...(atlasUrl ? [``, `Open Atlas: ${atlasUrl}`] : []),
    ...(prefsUrl ? [`Notification preferences: ${prefsUrl}`] : []),
    ``,
    `You're receiving this digest because you're a Collaborator on ${scope}.`,
  ].join("\n");

  // ── editorial HTML (YY port) ──
  const headerRow = (label: string, valueHtml: string) =>
    `<tr><td style="${monoMeta(INK.stone400)}width:48px;padding:0 0 6px 0;vertical-align:baseline;">${label}</td><td style="padding:0 0 6px 12px;vertical-align:baseline;">${valueHtml}</td></tr>`;
  // YY:25–54 — the white mail-headers card (rounded-t inside the shell)
  const header = `<div style="background:${INK.headerCard};border-bottom:1px solid ${INK.stone200};padding:24px 28px 16px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${headerRow("From", `<span style="font-family:${FONT_MONO};font-size:12px;color:${INK.stone700};">Atlas &lt;${escapeHtml(input.fromAddress)}&gt;</span>`)}
      ${headerRow("To", `<span style="font-family:${FONT_MONO};font-size:12px;color:${INK.stone700};">${escapeHtml(input.recipientName)} &lt;${escapeHtml(input.recipientEmail)}&gt;</span>`)}
      ${headerRow("Subject", `<span style="font-family:${FONT_SANS};font-size:14px;font-weight:500;color:${INK.stone900};">${escapeHtml(subject)}</span>`)}
      ${headerRow("Preview", `<span style="font-family:${FONT_SANS};font-size:14px;color:${INK.stone500};">${escapeHtml(preview)}</span>`)}
    </table>
  </div>`;

  const stat = (n: string, label: string) =>
    `<td width="33%" style="padding:0 8px;"><div style="background:${INK.statCard};border:1px solid ${INK.stone200};border-radius:16px;padding:20px;text-align:center;">
      <div style="font-family:${FONT_MONO};font-size:36px;font-weight:700;letter-spacing:-0.05em;line-height:1;color:${INK.stone900};">${escapeHtml(n)}</div>
      <div style="${monoMeta(INK.stone500)}margin:8px 0 0 0;">${escapeHtml(label)}</div>
    </div></td>`;

  const sectionLabel = (label: string) =>
    `<div style="${monoSection(INK.stone500)}border-bottom:1px solid ${INK.stone300};padding:0 0 8px 0;">${escapeHtml(label)}</div>`;

  const shipItem = (s: DigestShipItem, i: number, last: boolean) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;${last ? "" : `border-bottom:1px solid ${INK.stone200};`}"><tr>
      <td style="width:40px;font-family:${FONT_MONO};font-size:12px;color:${INK.stone400};padding:20px 0;vertical-align:baseline;">${String(i + 1).padStart(2, "0")}</td>
      <td style="padding:20px 0;vertical-align:baseline;">
        <span style="font-family:${FONT_SANS};font-size:18px;font-weight:600;letter-spacing:-0.025em;line-height:1.375;color:${INK.stone900};">${escapeHtml(s.title)}</span>
        ${s.fromYou ? `&nbsp;<span style="font-family:${FONT_MONO};font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:${INK.amber700};background:${INK.amber100_70};padding:2px 8px;border-radius:9999px;">from you</span>` : ""}
        <p style="font-family:${FONT_SANS};font-size:14px;line-height:1.625;color:${INK.stone700};margin:8px 0 0 0;">${escapeHtml(s.body)}</p>
        <div style="${monoMeta(INK.stone400)}margin:8px 0 0 0;">${escapeHtml(s.meta)}</div>
      </td>
    </tr></table>`;

  const inReviewRows = input.inReview.length
    ? input.inReview
        .map(
          (r, i) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;${i === input.inReview.length - 1 ? "" : `border-bottom:1px solid ${INK.stone200};`}"><tr>
        <td style="padding:16px 0;">
          <div style="font-family:${FONT_SANS};font-size:16px;color:${INK.stone900};">${escapeHtml(r.title)}</div>
          <div style="${monoMeta(INK.stone400)}margin:4px 0 0 0;">Ticket ${escapeHtml(r.ticketRef)} · awaiting the Owner&rsquo;s review</div>
        </td>
      </tr></table>`,
        )
        .join("")
    : `<p style="font-family:${FONT_SANS};font-size:14px;font-style:italic;line-height:1.625;color:${INK.stone600};margin:16px 0 0 0;">Nothing waiting on review right now.</p>`;

  const body = `<div style="padding:48px 40px;">
    <!-- YY:59–74 brand line -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:baseline;">
        <span style="font-family:${FONT_SANS};font-size:24px;font-weight:700;letter-spacing:-0.05em;line-height:1;color:${INK.stone900};">a</span><span style="display:inline-block;height:4px;width:4px;border-radius:9999px;background:${INK.amber500};vertical-align:top;"></span>
        &nbsp;<span style="${monoMeta(INK.stone500)}">Atlas · weekly digest</span>
      </td>
      <td align="right" style="${monoMeta(INK.stone400)}vertical-align:baseline;">${escapeHtml(input.windowLabel)}</td>
    </tr></table>
    <!-- YY:77 — text-4xl h1 (§4-M13's email h1 law) -->
    <h1 style="font-family:${FONT_SANS};font-size:36px;font-weight:700;letter-spacing:-0.05em;line-height:1.25;color:${INK.stone900};margin:32px 0 0 0;">Morning, ${escapeHtml(input.recipientName)}.</h1>
    <!-- YY:80–88 lede with the inline h-[2px] amber accent -->
    <p style="font-family:${FONT_SANS};font-size:18px;line-height:1.625;color:${INK.stone700};margin:16px 0 0 0;">
      ${escapeHtml(input.ownerName)} shipped <span style="font-weight:700;border-bottom:2px solid ${INK.amber500};">${input.ships.length} change${input.ships.length === 1 ? "" : "s"}</span> on ${escapeHtml(scope)} last week.
    </p>
    <!-- YY:91–95 stat cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:40px 0 0 0;border-collapse:separate;"><tr>
      ${stat(String(input.ships.length), "shipped")}
      ${stat(String(input.openedCount), "opened")}
      ${stat(String(input.inReview.length), input.inReview.length === 1 ? "still in review" : "still in review")}
    </tr></table>
    <!-- YY:98–129 what shipped -->
    <div style="margin:56px 0 0 0;">
      ${sectionLabel("What shipped")}
      ${
        input.ships.length
          ? input.ships.map((s, i) => shipItem(s, i, i === input.ships.length - 1)).join("")
          : `<p style="font-family:${FONT_SANS};font-size:14px;font-style:italic;line-height:1.625;color:${INK.stone600};margin:16px 0 0 0;">Nothing shipped this week — quiet weeks happen.</p>`
      }
    </div>
    <!-- YY:132–151 still in review -->
    <div style="margin:56px 0 0 0;">
      ${sectionLabel("Still in review")}
      ${inReviewRows}
    </div>
    <!-- YY:164–177 CTA card -->
    <div style="margin:56px 0 0 0;background:${INK.white};border:1px solid ${INK.stone200};border-radius:16px;padding:24px;">
      <div style="font-family:${FONT_MONO};font-size:10px;text-transform:uppercase;letter-spacing:0.25em;color:${INK.amber700};">Got something for next week?</div>
      <p style="${bodyProse(INK.stone700)}margin:12px 0 0 0;">File a Ticket in plain English. ${escapeHtml(input.ownerName)} sees it in triage, the Engine takes it from there, and you hear back when it&rsquo;s shipped.</p>
      ${atlasUrl ? `<div style="margin:20px 0 0 0;">${pillLink({ href: atlasUrl, label: "Open Atlas", kind: "primary", trailing: "→" })}</div>` : ""}
    </div>
    <!-- YY:180–192 colophon -->
    <div style="margin:64px 0 0 0;padding:40px 0 0 0;border-top:1px solid ${INK.stone300};">
      <p style="font-family:${FONT_SANS};font-size:14px;font-style:italic;line-height:1.625;color:${INK.stone500};margin:0;">
        You&rsquo;re receiving this digest because you&rsquo;re a Collaborator on ${escapeHtml(scope)}. Atlas only emails you about your projects' work.
        ${prefsUrl ? ` Switch to per-Ticket pings or turn the digest off entirely from <a href="${escapeHtml(prefsUrl)}" style="font-family:${FONT_MONO};font-size:12px;font-style:normal;color:${INK.amber700};text-decoration:none;">notification settings →</a>.` : ""}
      </p>
    </div>
  </div>`;

  // YY:196–203 footer
  const footer = `<div style="background:${INK.stone50};border-top:1px solid ${INK.stone200};padding:24px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="${monoMeta(INK.stone400)}">atlas<span style="padding:0 8px;">·</span>${escapeHtml(scope)}</td>
      <td align="right" style="${monoMeta(INK.stone400)}">${prefsUrl ? `<a href="${escapeHtml(prefsUrl)}" style="${monoMeta(INK.stone400)}text-decoration:none;">unsubscribe</a><span style="padding:0 8px;color:${INK.stone300};">·</span><a href="${escapeHtml(prefsUrl)}" style="${monoMeta(INK.stone400)}text-decoration:none;">notification preferences</a>` : ""}</td>
    </tr></table>
  </div>`;

  const html = emailDocument({ title: subject, headerHtml: header, bodyHtml: body, footerHtml: footer });
  return { subject, html, text };
}
