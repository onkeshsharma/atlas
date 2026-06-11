"use server";
/**
 * M5 — shared auth server actions.
 *
 * Sign-out is an ACTION, never a bare redirect: the v1 lesson holds in
 * spirit — cookies must actually clear before the user looks signed out.
 * The server SDK's auth.signOut() revokes the session upstream and
 * clears the cookies through the action's response.
 */
import { redirect } from "next/navigation";

import { auth } from "./server";

export async function signOutAction(): Promise<void> {
  await auth.signOut();
  redirect("/sign-in");
}
