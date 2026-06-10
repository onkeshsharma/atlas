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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored variant prototypes are BYTE-IDENTICAL design sources —
    // the canon cites them by file:line; lint must never touch them
    // (excluded via config, per the M3 charter — never by editing them).
    "design/variants/**",
  ]),
]);

export default eslintConfig;
