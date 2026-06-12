"use client";
/**
 * M15 — the root-layout 500 boundary (charter item 2). global-error
 * REPLACES the root layout when the layout itself throws, so it must
 * self-host what app/layout.tsx normally provides: the Geist pair,
 * globals.css, and the canon §1.4 page wash. Interior = the same
 * variant-ZZ port as app/error.tsx (ErrorEditorial — citations and the
 * honesty audit live there).
 *
 * Note (recorded): Next serves this boundary in production builds only —
 * dev mode shows its own overlay instead — so it is exercised by
 * typecheck/lint/review rather than the dev-server e2e suite
 * (notes/HANDOFF-M15.md flags it for M-SHIP's prod-build pass).
 */
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ErrorEditorial } from "@/src/components/system/ErrorEditorial";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* app/layout.tsx's shell, mirrored — the wash applies once here too */}
      <body className="min-h-full flex flex-col bg-white">
        <div className="flex min-h-screen flex-col bg-amber-50/30 text-stone-900">
          <ErrorEditorial digest={error.digest} reset={reset} />
        </div>
      </body>
    </html>
  );
}
