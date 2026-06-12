/**
 * M5 — the current-user helper every surface module consumes.
 *
 * Wrapped in React.cache() so a layout and its page share one resolution
 * per render (the v1 auth-vs-page race lesson — gate page render on auth
 * resolving; never double-fetch, never flash).
 *
 * M16 stabilisation: Neon Auth's /get-session endpoint can return 429 Too
 * Many Requests under load (e.g. consecutive e2e suite runs). When that
 * happens the library returns { data: null, error: { status: 429 } }.
 * Treating a 429 the same as "signed out" causes a spurious /sign-in
 * redirect that breaks tests and real users alike.
 *
 * The rate-limit window can persist for 10–30 seconds under heavy load
 * (particularly when the Neon Auth session-cookie minting fails mid-sign-in
 * because of a concurrent 429, leaving the next page load with no cached
 * session). We retry up to MAX_429_RETRIES times with exponential back-off
 * (2 s, 4 s, 8 s, …) before giving up. Total worst-case wait is bounded at
 * ~30 s — acceptable for a guard, never hit on the happy path (on the
 * happy path the cache cookie is present so auth.getSession() returns
 * immediately without calling upstream at all).
 */
import { cache } from "react";

import type { Membership } from "@/src/db/schema";

import { membershipFor } from "./memberships";
import type { Role } from "./roles";
import { auth } from "./server";

export type CurrentUser = {
  /** Neon Auth user id. */
  id: string;
  email: string;
  /** Neon Auth profile name (sign-up "Your name"). */
  name: string;
  /** Atlas role — null until a membership is attached (mid-signup edge). */
  role: Role | null;
  membership: Membership | null;
};

const MAX_429_RETRIES = 4;

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  let result = await auth.getSession();
  // Exponential back-off on 429 — the hosted Neon Auth server rate-limits
  // /get-session under high concurrency.  Retry up to MAX_429_RETRIES times
  // with doubling delays (2 s → 4 s → 8 s → 16 s); give up and treat as
  // "not signed in" only after all retries are exhausted.
  for (
    let attempt = 0;
    attempt < MAX_429_RETRIES &&
    !result.data &&
    (result.error as { status?: number } | null)?.status === 429;
    attempt++
  ) {
    await new Promise((r) => setTimeout(r, 2_000 * 2 ** attempt));
    result = await auth.getSession();
  }
  const session = result.data;
  if (!session?.user) return null;
  const membership = (await membershipFor(session.user.id)) ?? null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: membership?.role ?? null,
    membership,
  };
});
