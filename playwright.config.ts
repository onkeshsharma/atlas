import { defineConfig } from "@playwright/test";

// 1440 is the canonical design viewport (master plan §5).
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
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
