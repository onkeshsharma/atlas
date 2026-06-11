/**
 * M5 — the current-user helper every surface module consumes.
 *
 * Wrapped in React.cache() so a layout and its page share one resolution
 * per render (the v1 auth-vs-page race lesson — gate page render on auth
 * resolving; never double-fetch, never flash).
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

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { data: session } = await auth.getSession();
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
