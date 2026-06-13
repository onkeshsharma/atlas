import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // M4 — sandboxed distDir for the Playwright webServer (see next.config.ts);
    // M9 — ATLAS_E2E_DISTDIR is overridable (.next-e2e-m9 etc.), ignore the family.
    ".next-e2e*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored variant prototypes are BYTE-IDENTICAL design sources —
    // the canon cites them by file:line; lint must never touch them
    // (excluded via config, per the M3 charter — never by editing them).
    "design/variants/**",
    // BP3 — Node SEA build output (CJS bundle) and build scripts (.mjs).
    // The CJS bundle uses require() by design (esbuild CJS format); the
    // build script is a plain .mjs node script, not app code.
    "packages/bridge/dist/**",
    "packages/bridge/scripts/**",
  ]),
]);

export default eslintConfig;
