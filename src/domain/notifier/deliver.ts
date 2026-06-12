/**
 * M13 — delivery (Resend). The ONE place that talks to the provider.
 *
 * No RESEND_API_KEY ⇒ no delivery anywhere — rows stay `composed` in
 * the outbox and every surface says so honestly (charter: copy must
 * remain TRUE in the no-key configuration). Suites never set the key.
 *
 * Env contract (HANDOFF-M13 records it for Onkesh):
 *   RESEND_API_KEY   — enables sending (Vercel env / .env.local).
 *   ATLAS_EMAIL_FROM — verified sender, "Atlas <ship@yourdomain>";
 *                      defaults to Resend's onboarding address, which
 *                      only delivers to the account owner's own inbox.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function notifierFromAddress(): string {
  return process.env.ATLAS_EMAIL_FROM ?? "Atlas <onboarding@resend.dev>";
}

/** bare address for the stationery header rows ("ship@yourdomain"). */
export function notifierFromBareAddress(): string {
  const from = notifierFromAddress();
  const m = /<([^>]+)>/.exec(from);
  return m ? m[1] : from;
}

export type SendResult = { ok: true; providerId: string } | { ok: false; error: string };

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string | null;
  text: string;
  replyTo?: string | null;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "no RESEND_API_KEY configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: notifierFromAddress(),
        to: [input.to],
        subject: input.subject,
        ...(input.html ? { html: input.html } : {}),
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `resend ${res.status}: ${body.slice(0, 300)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerId: json.id ?? "unknown" };
  } catch (err) {
    return { ok: false, error: `resend unreachable: ${(err as Error).message}` };
  }
}
