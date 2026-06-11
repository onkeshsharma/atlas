import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// M5 — specs seed/clean real-Neon rows and read ATLAS_OWNER_CODE; the
// config module loads before any spec import, beating ESM hoisting.
config({ path: ".env.local", quiet: true });

// 1440 is the canonical design viewport (master plan §5).
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  // M6 — specs share ONE real Neon DB and the one-Owner invariant
  // (memberships_one_owner): pre-auth + m6-cockpit both bootstrap an
  // E2E Owner and self-clean, so spec files must never interleave.
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    // ATLAS_E2E_DISTDIR sandboxes the dev build output so this second
    // dev server doesn't trip Next 16's per-distDir lock when the
    // Owner's `pnpm dev` is already running on :3000 (see next.config.ts).
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { ATLAS_E2E_DISTDIR: ".next-e2e" },
  },
});
