#!/usr/bin/env node
/**
 * Copia los binarios WASM de @mediapipe/tasks-vision a public/mediapipe/wasm.
 *
 * Así la app los sirve desde su propio origen (sin CDN externa, sin sorpresas
 * de CSP) y esos ~10 MB de binarios no se versionan en el repo. Se ejecuta en
 * `postinstall`, antes de `dev` y antes de `build`.
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

async function main() {
  let source;
  try {
    // El paquete no exporta su package.json, así que resolvemos un binario
    // concreto y subimos al directorio que los contiene a todos.
    source = dirname(
      require.resolve("@mediapipe/tasks-vision/vision_wasm_internal.wasm"),
    );
  } catch {
    console.warn(
      "[mediapipe] @mediapipe/tasks-vision no está instalado; se omite la copia.",
    );
    return;
  }

  const target = join(process.cwd(), "public", "mediapipe", "wasm");
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });

  const files = await readdir(target);
  console.log(`[mediapipe] ${files.length} archivos WASM copiados a ${target}`);
}

main().catch((error) => {
  console.error("[mediapipe] fallo copiando los binarios WASM:", error);
  process.exitCode = 1;
});
