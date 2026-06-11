/**
 * M10 — the Account surface's identity reads/writes (BB; charter item 6).
 *
 * Sessions come from Neon Auth's hosted Better Auth server through the
 * server SDK (listSessions / revokeSession / revokeOtherSessions — the
 * managed `neon_auth.session` table is theirs to write, ours to read
 * about). Atlas renders ONLY what the API actually returns; 2FA and
 * email-change have no wired endpoint in @neondatabase/auth 0.4.2-beta,
 * so those rows render the honest M6-style "soon" treatment (recorded
 * deviation, charter item 6 — no dead switches).
 */
import { auth } from "./server";

export type SessionView = {
  /** Better Auth session token — the revoke handle. */
  token: string;
  createdAt: Date | null;
  expiresAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
};

function asDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** "Chrome 124 · Windows" from a user-agent — honest best-effort, never fiction. */
export function describeUserAgent(ua: string | null): string {
  if (!ua) return "unknown client";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) && /Version\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox"
    : null;
  const os =
    /Windows NT/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : /Linux/.test(ua) ? "Linux"
    : null;
  if (browser && os) return `${browser} · ${os}`;
  if (browser) return browser;
  if (os) return os;
  return "unknown client";
}

/** every live session for the signed-in user, current-first. */
export async function listSessions(): Promise<SessionView[]> {
  const [{ data: sessions }, { data: current }] = await Promise.all([
    auth.listSessions(),
    auth.getSession(),
  ]);
  const currentToken =
    current && typeof current === "object" && "session" in current
      ? ((current as { session?: { token?: string } }).session?.token ?? null)
      : null;
  if (!Array.isArray(sessions)) return [];
  const views: SessionView[] = [];
  for (const s of sessions) {
    if (typeof s !== "object" || s === null) continue;
    const row = s as Record<string, unknown>;
    if (typeof row.token !== "string") continue;
    views.push({
      token: row.token,
      createdAt: asDate(row.createdAt),
      expiresAt: asDate(row.expiresAt),
      ipAddress: typeof row.ipAddress === "string" ? row.ipAddress : null,
      userAgent: typeof row.userAgent === "string" ? row.userAgent : null,
      current: row.token === currentToken,
    });
  }
  views.sort((a, b) => Number(b.current) - Number(a.current));
  return views;
}

/** revoke ONE other session (BB:316 "sign out →"); never the current one. */
export async function revokeSession(token: string): Promise<{ ok: boolean }> {
  const { error } = await auth.revokeSession({ token });
  return { ok: !error };
}

/** BB:323 "sign out everywhere" — every session except this one. */
export async function revokeOtherSessions(): Promise<{ ok: boolean }> {
  const { error } = await auth.revokeOtherSessions();
  return { ok: !error };
}

export type ChangePasswordResult = { ok: true } | { ok: false; message: string };

/** real password change through the hosted auth server (BB:204–216 row). */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  if (input.newPassword.length < 12) {
    return { ok: false, message: "at least 12 characters" };
  }
  const { error } = await auth.changePassword({
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    revokeOtherSessions: false,
  });
  if (error) {
    return {
      ok: false,
      message:
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message ?? "password change failed")
          : "password change failed",
    };
  }
  return { ok: true };
}

export type ConnectedAccount = {
  providerId: string;
  createdAt: Date | null;
};

/** real connected sign-in methods (BB "Connected services", honest form). */
export async function listConnectedAccounts(): Promise<ConnectedAccount[]> {
  const { data } = await auth.listAccounts();
  if (!Array.isArray(data)) return [];
  const out: ConnectedAccount[] = [];
  for (const a of data) {
    if (typeof a !== "object" || a === null) continue;
    const row = a as Record<string, unknown>;
    if (typeof row.providerId !== "string") continue;
    out.push({ providerId: row.providerId, createdAt: asDate(row.createdAt) });
  }
  return out;
}
