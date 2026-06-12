/**
 * M13 — /dev-emails/<kind>: dev-gated preview of the REAL composed
 * emails (charter item 7's sanctioned route, gated exactly like
 * /dev-variants). The iframe srcDoc renders the byte-true html the
 * Notifier would hand Resend — the preview audits the delivery truth,
 * never a parallel React tree. `?format=plain` shows the text/plain
 * alternative (AA's bottom-right "plain-text fallback · view" made real).
 */
import { notFound } from "next/navigation";

import { devVariantsEnabled } from "../../dev-variants/_registry";
import { digestFixture, shipFixture } from "../_fixtures";

export const dynamic = "force-dynamic";

export default async function DevEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  if (!devVariantsEnabled()) notFound();
  const { kind } = await params;
  const { format } = await searchParams;
  if (kind !== "ship" && kind !== "digest") notFound();

  const email = kind === "ship" ? shipFixture() : digestFixture();

  if (format === "plain") {
    return (
      <div className="min-h-screen bg-stone-100 p-12">
        <div className="mx-auto max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            text/plain alternative · subj {email.subject}
          </div>
          <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-stone-200 bg-white p-8 font-mono text-[12px] leading-[1.7] text-stone-700">
            {email.text}
          </pre>
        </div>
      </div>
    );
  }

  return (
    // the composed document carries its own stone-100 canvas (AA:9) —
    // the iframe isolates it from app CSS, exactly like a mail client.
    <iframe
      title={`composed ${kind} email`}
      srcDoc={email.html}
      className="h-screen w-full border-0"
      data-testid="dev-email-frame"
    />
  );
}
