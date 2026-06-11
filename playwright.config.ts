import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// M5 — specs seed/clean real-Neon rows and read ATLAS_OWNER_CODE; the
// config module loads before any spec import, beating ESM hoisting.
config({ path: ".env.local", quiet: true });

// M7+M8 integration — Onkesh claimed the one-Owner slot on main, so the
// owner-bootstrap specs run against the dedicated `e2e` Neon branch
// (M5 flag: "give e2e its own Neon branch"). Mutating process.env HERE
// covers both the spec workers (src/db/client + domain imports resolve
// after this config) and the webServer (explicit env below). Auth is
// branch-scoped, so the base URL must switch with the DB.
if (process.env.ATLAS_E2E_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.ATLAS_E2E_DATABASE_URL;
}
if (process.env.ATLAS_E2E_NEON_AUTH_BASE_URL) {
  process.env.NEON_AUTH_BASE_URL = process.env.ATLAS_E2E_NEON_AUTH_BASE_URL;
}

// Parallel module worktrees (M7/M8) each run their own e2e server —
// ATLAS_E2E_PORT keeps them off each other's (and the default) port.
const E2E_PORT = Number(process.env.ATLAS_E2E_PORT ?? 3100);

// 1440 is the canonical design viewport (master plan §5).
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  // M6 — specs share ONE real Neon DB and the one-Owner invariant
  // (memberships_one_owner): pre-auth + m6-cockpit both bootstrap an
  // E2E Owner and self-clean, so spec files must never interleave.
  workers: 1,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    // ATLAS_E2E_DISTDIR sandboxes the dev build output so this second
    // dev server doesn't trip Next 16's per-distDir lock when the
    // Owner's `pnpm dev` is already running on :3000 (see next.config.ts).
    command: `pnpm dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Explicit DATABASE_URL/NEON_AUTH_BASE_URL so the e2e-branch override
    // above reaches the dev server even though `next dev` also loads
    // .env.local (real env vars beat Next's dotenv loader).
    env: {
      ATLAS_E2E_DISTDIR: ".next-e2e",
      ...(process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : {}),
      ...(process.env.NEON_AUTH_BASE_URL
        ? { NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL }
        : {}),
    },
  },
});
