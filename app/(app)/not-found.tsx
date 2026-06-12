/**
 * M15 — the (app) not-found boundary: in-group notFound() (unknown
 * ticket/run/project refs) keeps the (app) layout MOUNTED — the real
 * shell rail stays, nothing active (X:13–44's intent for free; proven
 * in e2e/m15-system.spec.ts: without this boundary the root one renders
 * a SECOND rail). Interior = the shared variant X port (citations +
 * deviations in src/components/system/NotFoundEditorial.tsx).
 */
import { NotFoundEditorial } from "@/src/components/system/NotFoundEditorial";

export default async function AppNotFound() {
  return <NotFoundEditorial />;
}
