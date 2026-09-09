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
    // Binarios y loaders de MediaPipe copiados por scripts/copy-mediapipe-wasm.mjs.
    "public/mediapipe/**",
    // Generados al correr `npm run test:e2e` (ver .gitignore); sin esto,
    // el bundle del trace viewer de Playwright revienta el lint.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
