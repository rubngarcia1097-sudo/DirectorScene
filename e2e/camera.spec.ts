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
