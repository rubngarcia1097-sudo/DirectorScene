import { expect, test } from "@playwright/test";

test("expone un manifest de PWA válido con sus iconos", async ({ page, request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();

  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("DirectorScene");
  expect(manifest.start_url).toBe("/director");
  expect(manifest.display).toBe("standalone");

  for (const icon of manifest.icons as Array<{ src: string }>) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok(), `icono ${icon.src} debe responder 200`).toBeTruthy();
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
});

test("un tamaño de icono no permitido da 404", async ({ request }) => {
  const response = await request.get("/icons/999");
  expect(response.status()).toBe(404);
});

test("el service worker deja la app usable sin red tras la primera visita", async ({
  page,
  context,
}) => {
  // Primera visita en línea: deja que el service worker precachee el
  // cascarón (`/director` incluido — si no, la navegación offline falla en
  // frío más abajo) y que encender la cámara descargue y cachee los
  // binarios de MediaPipe (WASM + modelos, varios MB desde /mediapipe/**).
  await page.goto("/director");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  // Aparece tanto en la píldora del HUD como en el panel lateral; basta con
  // que se vea la primera para probar que el motor analizó un frame.
  await expect(page.getByText("No te veo en cuadro").first()).toBeVisible({ timeout: 15_000 });

  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "DirectorScene" })).toBeVisible();

  // Vuelve a encender la cámara ya sin red: si los binarios de MediaPipe no
  // estuvieran realmente en caché, el motor nunca llegaría a analizar un
  // frame y esta sugerencia no aparecería.
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible({ timeout: 10_000 });
  // Aparece tanto en la píldora del HUD como en el panel lateral; basta con
  // que se vea la primera para probar que el motor analizó un frame.
  await expect(page.getByText("No te veo en cuadro").first()).toBeVisible({ timeout: 15_000 });

  await context.setOffline(false);
});
