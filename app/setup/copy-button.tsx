"use client";
/**
 * M5 — hover copy affordance on the install command block, ported from
 * design/variants/variant-q-setup.tsx:105–107. Variant-specific chrome
 * (not a kit primitive — XX's Copy pill belongs to SecretBlock).
 */
import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-widest text-stone-500 bg-white border border-stone-200 hover:border-stone-300 hover:text-stone-900 px-2 py-1 rounded-md transition opacity-0 group-hover:opacity-100"
    >
      {copied ? "copied ✓" : "copy ↗"}
    </button>
  );
}
