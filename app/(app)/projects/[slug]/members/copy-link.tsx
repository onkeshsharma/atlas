"use client";
/**
 * M11 — pending-invite "copy link" affordance (M:271's "resend →",
 * made honest): no email sends, so resending is re-sharing — the magic
 * link is durable until the invite resolves, and this copies it again.
 */
import { useState } from "react";

export function CopyLinkButton({ magicLink }: { magicLink: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(magicLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
    >
      {copied ? "copied ✓" : "copy link →"}
    </button>
  );
}
