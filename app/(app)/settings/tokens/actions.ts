"use server";
/**
 * M10 — API token actions (XX; PRD #36). The plaintext token exists
 * only in these return values — rendered once by the show-once panel,
 * never stored, never logged.
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import {
  createApiToken,
  revokeApiToken,
  rotateApiToken,
  validateScopes,
  validateTokenName,
} from "@/src/domain/tokens/api-tokens";

export type TokenActionState = {
  /** show-once secret. */
  token?: string;
  name?: string;
  rotated?: boolean;
  fieldError?: string;
  scopeError?: string;
};

export async function createTokenAction(
  _prev: TokenActionState,
  formData: FormData,
): Promise<TokenActionState> {
  await requireOwner();
  const name = validateTokenName(String(formData.get("name") ?? ""));
  if (!name.ok) return { fieldError: name.message };
  const scopes = validateScopes(formData.getAll("scopes").map(String));
  if (!scopes.ok) return { scopeError: scopes.message };
  const expiresDays = Number(formData.get("expiresDays") ?? 90);
  const created = await createApiToken({
    name: name.name,
    scopes: scopes.scopes,
    expiresDays,
  });
  revalidatePath("/settings/tokens");
  return { token: created.token, name: name.name };
}

export async function rotateTokenAction(input: {
  id: string;
  name: string;
}): Promise<TokenActionState> {
  await requireOwner();
  const rotated = await rotateApiToken({ id: input.id });
  revalidatePath("/settings/tokens");
  if (!rotated) return { fieldError: "token already revoked — create a new one" };
  return { token: rotated.token, name: input.name, rotated: true };
}

export async function revokeTokenAction(input: { id: string }): Promise<void> {
  await requireOwner();
  await revokeApiToken({ id: input.id });
  revalidatePath("/settings/tokens");
}
