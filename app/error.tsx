"use client";
/**
 * M15 — the route-tree 500 boundary (PRD #56; charter item 2). Catches
 * every thrown render/server error below the root layout and renders the
 * editorial 500 (variant ZZ — port + honesty audit live in
 * src/components/system/ErrorEditorial.tsx). "Try again" is the
 * boundary's real reset(). Root-layout failures are global-error.tsx's.
 */
import { ErrorEditorial } from "@/src/components/system/ErrorEditorial";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorEditorial digest={error.digest} reset={reset} />;
}
