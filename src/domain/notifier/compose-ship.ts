/**
 * M13 — the Ship Notification composer (PRD #28/#44; variant AA).
 *
 * Composes the plain-language summary + what-to-verify from the run's
 * REAL diff and the ticket's story — the run-shipped.tsx (V-page)
 * precedent: no LLM prose, only sentences every input can stand behind.
 * Markup per AA via the mail-safe vocabulary in email-render.ts;
 * `emailFormat: plain` recipients get the honest text/plain body alone.
 */
import type { RunDiffStats } from "@/src/domain/run/diff-stats";

import {
  FONT_MONO,
  FONT_SANS,
  INK,
  bodyProse,
  emailDocument,
  escapeHtml,
  monoMeta,
  pillLink,
  shipFooter,
  shipHeader,
} from "./email-render";

export type ShipEmailInput = {
  /** greeting name — display name's first word, or the email's local part. */
  recipientName: string;
  recipientEmail: string;
  /** the Owner's display name (signature; AA:114/119). */
  ownerName: string;
  projectName: string;
  ticketRef: string;
  ticketTitle: string;
  /** "3 days ago" — AA:135. */
  filedAgo: string;
  prUrl: string | null;
  diff: RunDiffStats | null;
  /** ATLAS_APP_URL when configured — links render only when real. */
  appUrl: string | null;
  /** whether replies to the email reach the Owner (reply_to is set). */
  replyToOwner: boolean;
  /** the REAL sending address (notifier config) — the stationery shows the truth. */
  fromAddress: string;
};

export type ComposedEmail = { subject: string; html: string; text: string };

/** AA:52 — the subject line. */
export function shipSubject(ticketTitle: string): string {
  return `Your “${ticketTitle}” is shipped`;
}

/**
 * The what-to-verify prose (AA:78–88's slot, composed honestly from the
 * V-page recipe). Exported — the collab ticket page renders the same
 * sentence, so the email and the surface can never disagree.
 */
export function verifyProse(input: {
  projectName: string;
  ticketTitle: string;
  diff: RunDiffStats | null;
}): string {
  const opener = `To check this works: open ${input.projectName} and try what you asked for in “${input.ticketTitle}”.`;
  if (input.diff && input.diff.filesChanged > 0) {
    const files = `${input.diff.filesChanged} file${input.diff.filesChanged === 1 ? "" : "s"}`;
    return `${opener} The Engine changed ${files} (+${input.diff.insertions} −${input.diff.deletions} lines) to make it happen.`;
  }
  return `${opener} The Owner reviewed the change before it landed.`;
}

export function composeShipEmail(input: ShipEmailInput): ComposedEmail {
  const subject = shipSubject(input.ticketTitle);
  const verify = verifyProse(input);
  const ticketUrl = input.appUrl ? `${input.appUrl}/tickets/${input.ticketRef}` : null;
  const prefsUrl = input.appUrl ? `${input.appUrl}/settings/notifications` : null;

  // ── text/plain (always composed — the honest fallback + `plain` format) ──
  const text = [
    `Hi ${input.recipientName},`,
    ``,
    `The “${input.ticketTitle}” you asked for is live on ${input.projectName}.`,
    ``,
    verify,
    ``,
    ...(input.prUrl ? [`Pull Request: ${input.prUrl}`, ``] : []),
    ...(ticketUrl ? [`View it in Atlas: ${ticketUrl}`, ``] : []),
    input.replyToOwner
      ? `If anything still feels off, just reply to this email — it goes straight back to ${input.ownerName}. Re-opening is a new Ticket in Atlas.`
      : `If anything still feels off, file a follow-up Ticket in Atlas — it goes straight to ${input.ownerName}.`,
    ``,
    `— ${input.ownerName}`,
    `via Atlas`,
    ``,
    `Ticket ${input.ticketRef} · filed by you ${input.filedAgo}`,
    ...(prefsUrl ? [``, `Notification preferences: ${prefsUrl}`] : []),
  ].join("\n");

  // ── editorial HTML (AA port, inline-styled) ──
  const actions: string[] = [];
  if (ticketUrl)
    actions.push(pillLink({ href: ticketUrl, label: `View ${input.ticketRef} in Atlas`, kind: "primary", trailing: "→" }));
  if (input.prUrl)
    actions.push(pillLink({ href: input.prUrl, label: "See the Pull Request", kind: "secondary", trailing: "↗" }));

  const body = `<div style="padding:40px;">
    <!-- AA:61 greeting -->
    <p style="${bodyProse(INK.stone700)}">Hi <span style="font-weight:500;color:${INK.stone900};">${escapeHtml(input.recipientName)}</span>,</p>
    <!-- AA:66 lede — text-2xl tracking-tight -->
    <p style="font-family:${FONT_SANS};font-size:24px;line-height:1.25;letter-spacing:-0.025em;color:${INK.stone900};margin:24px 0 0 0;">
      The <span style="font-weight:600;">${escapeHtml(input.ticketTitle)}</span> you asked for is live on <span style="font-weight:600;">${escapeHtml(input.projectName)}</span>.
    </p>
    <!-- AA:74–92 — emerald PullQuote (§2.15: emerald in shipped contexts).
         Hanging-quote geometry as a two-column table: mail clients strip
         position:absolute (AA:75's recipe), so the 24px gutter column
         carries the oversized glyph beside the first line — same render,
         mail-safe (convergence r2 fix). -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:40px 0 0 0;border-collapse:collapse;"><tr>
      <td style="width:24px;vertical-align:top;font-family:${FONT_SANS};font-weight:700;font-size:48px;line-height:0.75;color:${INK.emerald400_80};">&ldquo;</td>
      <td style="vertical-align:top;">
        <p style="font-family:${FONT_SANS};font-size:16px;font-style:italic;line-height:1.625;color:#292524;margin:0;">${escapeHtml(verify)}</p>
        <div style="${monoMeta(INK.stone500)}margin:12px 0 0 0;">what the Engine did, in plain language</div>
      </td>
    </tr></table>
    ${actions.length ? `<div style="margin:48px 0 0 0;">${actions.join("&nbsp;&nbsp;")}</div>` : ""}
    <!-- AA:108 — the still-broken line -->
    <p style="${bodyProse(INK.stone700)}margin:48px 0 0 0;">
      ${
        input.replyToOwner
          ? `If anything still feels off, just reply to this email — it&rsquo;ll go straight back to <span style="font-weight:500;color:${INK.stone900};">${escapeHtml(input.ownerName)}</span>.`
          : `If anything still feels off, file a follow-up Ticket in Atlas — it&rsquo;ll go straight to <span style="font-weight:500;color:${INK.stone900};">${escapeHtml(input.ownerName)}</span>.`
      }
    </p>
    <!-- AA:118 signature -->
    <p style="${bodyProse(INK.stone700)}margin:48px 0 0 0;">
      &mdash; ${escapeHtml(input.ownerName)}<br />
      <span style="font-family:${FONT_MONO};font-size:12px;color:${INK.stone500};">via Atlas</span>
    </p>
    <!-- AA:127–140 — ticket reference rule -->
    <div style="margin:48px 0 0 0;padding:24px 0 0 0;border-top:1px solid ${INK.stone200};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="${monoMeta(INK.stone400)}">Ticket <span style="color:${INK.stone700};">${escapeHtml(input.ticketRef)}</span><span style="padding:0 8px;">·</span>filed by you <span style="color:${INK.stone500};">${escapeHtml(input.filedAgo)}</span></td>
        ${ticketUrl ? `<td align="right" style="${monoMeta(INK.stone400)}"><a href="${escapeHtml(ticketUrl)}" style="color:${INK.stone700};text-decoration:none;">view in Atlas →</a></td>` : ""}
      </tr></table>
    </div>
  </div>`;

  const html = emailDocument({
    title: subject,
    headerHtml: shipHeader({
      fromName: "Atlas",
      fromAddress: input.fromAddress,
      to: input.recipientEmail,
      subject,
    }),
    bodyHtml: body,
    footerHtml: shipFooter({ prefsUrl }),
  });

  return { subject, html, text };
}
