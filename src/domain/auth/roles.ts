/**
 * M5 — the role vocabulary (CONTEXT.md: Owner / Collaborator; never
 * admin/user/friend). One source of truth: the pgEnum in src/db/schema.
 */

export const ROLES = ["owner", "collaborator"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
