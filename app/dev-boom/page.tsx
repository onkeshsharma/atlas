/**
 * M15 — the honest 500 trigger (charter item 5). Throws a REAL server
 * render error so e2e can assert the app/error.tsx boundary (variant ZZ)
 * — no mocked error page, the genuine article.
 *
 * Gated EXACTLY like /dev-variants: devVariantsEnabled() reads
 * ATLAS_DEV_VARIANTS_ENABLED, which lives only in .env.development
 * (loaded by `next dev` — never set in prod), so in production this
 * route 404s by construction.
 *
 * The defuse cookie proves reset() is real, not decorative: the spec
 * lands on the boom (error boundary renders), sets the cookie, clicks
 * "Try again →", and the SAME route then renders fine — the boundary
 * genuinely re-attempted the render.
 */
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { devVariantsEnabled } from "../dev-variants/_registry";

export const dynamic = "force-dynamic";

export default async function DevBoomPage() {
  if (!devVariantsEnabled()) {
    notFound();
  }
  const jar = await cookies();
  if (jar.get("atlas_dev_boom_defused")?.value === "1") {
    return (
      <main className="flex-1 flex items-center justify-center px-16 py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-stone-500">
          boom defused — this render completed.
        </p>
      </main>
    );
  }
  throw new Error("ATLAS_DEV_BOOM — dev-only 500 trigger (M15)");
}
