// M5 — Neon Auth proxy route: the browser talks to /api/auth/*, this
// handler forwards to the hosted Better Auth server (NEON_AUTH_BASE_URL)
// and manages the session cookies.
import { auth } from "@/src/domain/auth/server";

export const { GET, POST } = auth.handler();
