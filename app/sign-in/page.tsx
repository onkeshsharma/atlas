// M5 — Sign-in. Ported from design/variants/variant-l-signin.tsx:9–118
// (fidelity protocol §5; canon §4-M5 row: no sidebar, centered max-w-md
// form column, text-7xl wordmark hero, mono wordmark top-left, quiet mono
// link top-right, corner meta links bottom). The variant's bottom-left
// design-lab colophon is NOT ported (canon §4 footnote).
import Link from "next/link";

import { dayStamp } from "@/src/lib/format";

import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ forgot?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      {/* Top-left mini wordmark — the only chrome on the page (L:11) */}
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas
      </div>

      {/* Top-right quiet sign-up link (L:16) */}
      <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        New here?{" "}
        <Link
          href="/sign-up"
          className="text-stone-900 hover:text-amber-600 cursor-pointer underline-offset-4 hover:underline"
        >
          Sign up →
        </Link>
      </div>

      {/* Centered editorial sign-in (L:24) */}
      <main className="min-h-screen flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Editorial day-stamp / opening line (L:27) */}
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            {dayStamp()}
          </div>

          {/* Hero wordmark + period (L:32) */}
          <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-none">Atlas.</h1>

          {/* Tagline (L:37) */}
          <p className="mt-5 text-xl text-stone-700 leading-relaxed">
            A quiet place to drive your project. Tell the Engine what to do; review what it
            ships.
          </p>

          {/* Sign-in form (L:43) */}
          <section className="mt-16">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
              Sign in
            </div>
            <SignInForm
              forgotHint={params.forgot === "1"}
              googleError={params.error === "google"}
            />
          </section>

          {/* Quiet editorial note (L:99) */}
          <p className="mt-12 text-sm text-stone-500 italic leading-relaxed">
            Atlas is invite-only. If you don&rsquo;t have an invite, ask the Owner of the
            Project you were working on to send you one.
          </p>
        </div>
      </main>

      {/* Right-bottom quiet meta (L:112) */}
      <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        <a className="hover:text-stone-700 cursor-pointer">privacy</a>
        <span className="mx-2 text-stone-300">·</span>
        <a className="hover:text-stone-700 cursor-pointer">terms</a>
        <span className="mx-2 text-stone-300">·</span>
        <a className="hover:text-stone-700 cursor-pointer">docs</a>
      </div>
    </div>
  );
}
