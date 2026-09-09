import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mismo alias que tsconfig.json ("@/*" -> "./*"): sin esto, cualquier
    // módulo importado por un test que a su vez use "@/..." (p. ej. un hook
    // que importa "@/lib/ai/...") falla a resolver fuera de Next.js.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // Por defecto Vitest recoge cualquier *.spec.ts, incluidos los E2E de
    // Playwright en e2e/ (que usan su propio test runner, no el de Vitest).
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
