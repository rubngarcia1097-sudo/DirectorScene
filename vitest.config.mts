import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Por defecto Vitest recoge cualquier *.spec.ts, incluidos los E2E de
    // Playwright en e2e/ (que usan su propio test runner, no el de Vitest).
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
