import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();
});

test("elegir un filtro cambia el look de la vista previa en vivo", async ({ page }) => {
  const filter = () => page.locator("video").evaluate((el) => getComputedStyle(el).filter);

  await expect
    .poll(filter)
    .toBe("none");

  await page.getByRole("button", { name: "Blanco y negro" }).click();
  await expect.poll(filter).toContain("grayscale(1)");

  await page.getByRole("button", { name: "Vívido" }).click();
  await expect.poll(filter).toContain("saturate(1.35)");
});

test("el ajuste de luz se combina con el filtro elegido", async ({ page }) => {
  const filter = () => page.locator("video").evaluate((el) => getComputedStyle(el).filter);

  await page.getByRole("button", { name: "Cálido" }).click();
  await page.getByRole("slider", { name: "Ajuste de luz" }).fill("0.6");

  const value = await filter();
  expect(value).toContain("sepia");
  expect(value).toMatch(/brightness\(1\.\d+\)/);
});

test("grabar y capturar foto funcionan con un filtro y ajuste de luz activos", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Vívido" }).click();
  await page.getByRole("slider", { name: "Ajuste de luz" }).fill("-0.5");
  await page.getByLabel("Con audio").uncheck();
  await page.getByLabel(/Cuenta atrás/).uncheck();

  await page.getByRole("button", { name: /Grabar clip/i }).click();
  await expect(page.getByText(/Grabando/)).toBeVisible();
  await page.getByRole("button", { name: /Detener/i }).click();
  await expect(page.getByText(/Clip listo/)).toBeVisible({ timeout: 10_000 });

  // `canvas.toBlob()` con un filtro activo, justo después de otra grabación
  // en el mismo proceso de navegador: bajo la carga acumulada de WASM/WebGL
  // por software del resto de la suite (ver playwright.config.ts) puede
  // tardar bastante más que en aislamiento, aunque siempre se resuelve.
  await page.getByRole("button", { name: "📷 Foto" }).click();
  await expect(page.getByText("Descargar foto")).toBeVisible({ timeout: 20_000 });
});

test("el panel de calidad muestra una configuración ideal explícita", async ({ page }) => {
  await page.getByRole("button", { name: /Calidad de grabación/i }).click();
  await expect(page.getByText("Configuración ideal para esta cámara")).toBeVisible();
  await expect(page.getByText(/salida en 1080p a \d+ fps/)).toBeVisible();
});
