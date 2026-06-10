// M3 — render one vendored variant prototype by URL key, e.g.
// /dev-variants/e → variant E (Today, feed-first). Dev-only; clean rewrite
// of the v1.3 pattern (read: atlas/app/dev-variants/[key]/page.tsx, T120).
import { notFound } from "next/navigation";

import { devVariantsEnabled, findVariant } from "../_registry";

export const dynamic = "force-dynamic";

export default async function DevVariantPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  if (!devVariantsEnabled()) {
    notFound();
  }
  const { key } = await params;
  const entry = findVariant(key);
  if (!entry) {
    notFound();
  }
  const { Component } = entry;
  return <Component />;
}
