import { expect, test } from "@playwright/test";

test("captura una foto y la descarta sin afectar a la grabación", async ({ page }) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();

  await page.getByRole("button", { name: "📷 Foto" }).click();
  await expect(page.getByText("Descargar foto")).toBeVisible();

  const download = page.getByRole("link", { name: /Descargar foto/i });
  await expect(download).toHaveAttribute("href", /^blob:/);
  await expect(download).toHaveAttribute("download", /\.png$/);

  await page.getByRole("button", { name: /Descartar foto/i }).click();
  await expect(page.getByRole("button", { name: "📷 Foto" })).toBeVisible();
});

test("se puede capturar una foto mientras se graba un vídeo", async ({ page }) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await page.getByLabel("Con audio").uncheck();
  await page.getByLabel(/Cuenta atrás/).uncheck();

  await page.getByRole("button", { name: /Grabar clip/i }).click();
  await expect(page.getByText(/Grabando/)).toBeVisible();

  await page.getByRole("button", { name: "📷 Foto" }).click();
  await expect(page.getByText("Descargar foto")).toBeVisible();
  // La grabación sigue su curso, sin verse interrumpida por la foto.
  await expect(page.getByText(/Grabando/)).toBeVisible();

  await page.getByRole("button", { name: /Detener/i }).click();
  await expect(page.getByText(/Clip listo/)).toBeVisible({ timeout: 10_000 });
});
