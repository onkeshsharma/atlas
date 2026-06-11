/**
 * M5 — route-guard helpers (charter §2; M6's app shell consumes these).
 *
 * Two layers of guarding:
 *  1. proxy.ts (edge) — auth.middleware() bounces signed-out requests to
 *     /sign-in before rendering starts. Coarse, cookie-based.
 *  2. these helpers (server components / actions) — resolve the session
 *     AND the membership, redirecting precisely. Use them in any guarded
 *     layout/page; never render guarded content before they return.
 */
import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "./current-user";

/** Signed-in user of any role, else → /sign-in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** Signed-in Owner, else Collaborators land on their onboarding surface. */
export async function requireOwner(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === null) redirect("/no-access"); // session without membership (e.g. social sign-in by a stranger)
  if (user.role !== "owner") redirect("/onboarding");
  return user;
}

/** Signed-in Collaborator; Owners go to their welcome surface. */
export async function requireCollaborator(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === null) redirect("/no-access");
  if (user.role !== "collaborator") redirect("/welcome");
  return user;
}
