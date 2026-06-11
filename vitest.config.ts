import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // mirror tsconfig's `@/*` → repo root (M5 — domain tests import @/src/…)
    alias: { "@": resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // integration tests hit the real Neon atlas-v2 DB (PRD testing
    // decisions) — DATABASE_URL comes from .env.local.
    setupFiles: ["tests/setup-env.ts"],
  },
});
