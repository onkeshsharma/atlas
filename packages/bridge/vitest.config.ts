import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // worktree + fake-engine tests spawn real git / node children.
    testTimeout: 30_000,
  },
});
