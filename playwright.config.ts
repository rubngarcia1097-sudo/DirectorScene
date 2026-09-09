import { defineConfig, devices } from "@playwright/test";

/**
 * Suite E2E de humo: cubre lo que hasta ahora se verificaba a mano con
 * Playwright en cada sesión (cámara, grabación, foto, calidad de
 * dispositivo, PWA). Corre contra un build de producción real, no el
 * servidor de desarrollo.
 *
 * Las rutas de modelo (`webServer.env`) apuntan a `public/mediapipe/models/`
 * en vez del bucket de Google: `npm run fetch:models` los deja ahí antes de
 * arrancar el servidor (ver el workflow de CI). Server 404 local determinista
 * se descartó a propósito — un intento de carga que nunca resuelve compite
 * por el hilo principal con los `setInterval` de la cuenta atrás y los
 * ralentiza de forma real, no solo cosmética.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Cada test abre su propio Chromium con cámara falsa y MediaPipe cargando
  // en paralelo — en un runner de CI con pocos núcleos, varios a la vez se
  // pisan por CPU y generan timeouts que no reflejan un problema real de la
  // app. Mejor correrlos en serie ahí; en local, Playwright decide.
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  // 2 en CI: en un runner sin GPU, varios tests seguidos que cada uno carga
  // su propio motor de MediaPipe acumulan trabajo de fondo (WASM, WebGL por
  // software) en el mismo proceso de navegador compartido entre tests del
  // worker. La latencia resultante es variable — de <1 s a bastante más—
  // pero la operación en sí siempre se resuelve bien; nunca se ha visto
  // realmente bloqueada. Confirmado repitiendo la suite más de diez veces
  // durante el desarrollo de estas pruebas.
  retries: process.env.CI ? 2 : 0,
  // "list" para la salida de la consola del job; "html" (sin abrir el
  // navegador solo, y sin publicarlo aparte) para tener algo que adjuntar
  // como artefacto de CI cuando falla — trace y capturas incluidos.
  reporter: [["list"], ["html", { open: "never" }]],
  // MediaRecorder.onstop, canvas.toBlob, el motor de MediaPipe cargando en
  // paralelo (comparte hilo principal) y el propio re-render de React tras
  // detener una grabación no son instantáneos; el default de 5 s de
  // Playwright se queda corto bajo carga.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
      // Solo para desarrollo local en entornos con un Chromium ya instalado
      // en una ruta no estándar; en CI se deja sin definir y Playwright usa
      // el navegador que instala `npx playwright install`.
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    },
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_POSE_MODEL_URL: "/mediapipe/models/pose_landmarker_lite.task",
      NEXT_PUBLIC_FACE_MODEL_URL: "/mediapipe/models/face_landmarker.task",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
