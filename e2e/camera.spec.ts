import { expect, test } from "@playwright/test";

test("enciende la cámara y muestra el recorte de la plataforma por defecto", async ({
  page,
}) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();

  await expect(page.locator("video")).toBeVisible();
  // TikTok (9:16) es la plataforma por defecto. El recorte en sí se dibuja
  // en un <canvas> (GuideOverlay), no como texto DOM, así que lo único
  // verificable ahí es el estado del control que lo determina.
  await expect(page.getByRole("button", { name: /^TikTok 9:16$/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("cambiar de plataforma actualiza cuál botón queda marcado", async ({ page }) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();

  await page.getByRole("button", { name: /^YouTube 16:9$/ }).click();
  await expect(page.getByRole("button", { name: /^YouTube 16:9$/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /^TikTok 9:16$/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("una plantilla rápida aplica plataforma, estilo de plano y guías de golpe", async ({
  page,
}) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();

  // Por defecto el estudio arranca en TikTok/"Hablas a cámara"; cambiar antes
  // de aplicar la plantilla confirma que esta sí sobrescribe lo que hubiera.
  await page.getByRole("button", { name: /^YouTube 16:9$/ }).click();
  await page.getByRole("button", { name: "Producto en mano", exact: true }).click();

  await page.getByRole("button", { name: "TikTok Shop · Producto en mano" }).click();

  await expect(page.getByRole("button", { name: /^TikTok 9:16$/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Producto en mano", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // La plantilla de producto silencia los avisos de baja severidad ("Solo avisos").
  await expect(
    page.getByRole("button", { name: "Solo avisos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("la guía técnica es fija y cambia con el estilo de plano, no con lo que detecte el motor", async ({
  page,
}) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();

  await expect(page.getByText("Guía técnica · Hablas a cámara")).toBeVisible();
  await expect(page.getByText(/Cámara a la altura de los ojos/)).toBeVisible();

  await page.getByRole("button", { name: "Producto en mano", exact: true }).click();
  await expect(page.getByText("Guía técnica · Producto en mano")).toBeVisible();
  await expect(page.getByText(/Cámara a la altura del pecho/)).toBeVisible();
});

test("el manual de uso se puede abrir y explica plantillas, colores y atajos", async ({
  page,
}) => {
  await page.goto("/director");

  await page.getByRole("button", { name: /Guía de uso/i }).click();
  await expect(page.getByText("Cómo funciona")).toBeVisible();
  await expect(page.getByText("Qué significan los colores")).toBeVisible();
  await expect(page.getByText(/Barra espaciadora: grabar o detener/)).toBeVisible();
});

test("una cámara que informa facingMode 'environment' no sale espejada", async ({ page }) => {
  // La cámara falsa de Chromium no reporta facingMode (no es ni frontal ni
  // trasera de verdad); se simula lo que sí reporta una trasera real para
  // reproducir el bug: elegir una cámara por deviceId (el desplegable, que
  // puede listar varias traseras) nunca actualizaba el estado "frontal/
  // trasera" con la que la propia pista negoció, así que la trasera podía
  // quedar espejada igual que la frontal.
  await page.addInitScript(() => {
    const original = MediaStreamTrack.prototype.getSettings;
    MediaStreamTrack.prototype.getSettings = function (this: MediaStreamTrack) {
      return { ...original.call(this), facingMode: "environment" };
    };
  });

  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();

  const transform = () =>
    page.locator("video").evaluate((el) => getComputedStyle(el).transform);
  // La corrección llega en un estado aparte, después de que getUserMedia()
  // resuelva y se lea la pista — un poll evita la carrera con ese primer
  // render, que todavía muestra el valor espejado por defecto.
  await expect.poll(transform, { timeout: 10_000 }).toBe("none");
});

test("por defecto (sin facingMode reportado) la vista sigue espejada, como una cámara frontal", async ({
  page,
}) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();

  const transform = () =>
    page.locator("video").evaluate((el) => getComputedStyle(el).transform);
  // scaleX(-1) se representa como matrix(-1, 0, 0, 1, 0, 0).
  await expect.poll(transform, { timeout: 10_000 }).toBe("matrix(-1, 0, 0, 1, 0, 0)");
});
