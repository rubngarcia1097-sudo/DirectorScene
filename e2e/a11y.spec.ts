import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Barrido con axe-core en los estados reales de la app, no solo en el
// marcado estático: muchas violaciones (contraste de un panel colapsado,
// del reproductor tras grabar, de la vista de foto) solo existen una vez
// que el usuario interactúa. Cada estado es su propio test: el escaneo de
// axe tiene un coste real y encadenar varios en un solo test (grabar +
// escanear + detener + escanear + foto + escanear) se comió el timeout por
// defecto bajo la carga acumulada de WASM/WebGL por software del resto de
// la suite.
async function expectNoViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("la landing no tiene violaciones de accesibilidad", async ({ page }) => {
  await page.goto("/");
  await expectNoViolations(page);
});

test("el estudio no tiene violaciones con la cámara apagada", async ({ page }) => {
  await page.goto("/director");
  await expectNoViolations(page);
});

test("el estudio no tiene violaciones con la cámara encendida ni con los paneles abiertos", async ({
  page,
}) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole("button", { name: /Calidad de grabación/i }).click();
  await page.getByLabel(/Uso la cámara integrada de mi laptop/i).check();
  await page.getByRole("button", { name: /Cuenta y presets/i }).click();
  await expectNoViolations(page);
});

test.describe("con la cámara ya encendida", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/director");
    await page.getByRole("button", { name: /Encender cámara/i }).click();
    await expect(page.locator("video")).toBeVisible();
    await page.getByLabel("Con audio").uncheck();
    await page.getByLabel(/Cuenta atrás/).uncheck();
  });

  test("grabando no hay violaciones", async ({ page }) => {
    await page.getByRole("button", { name: /Grabar clip/i }).click();
    await expect(page.getByText(/Grabando/)).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("button", { name: /Detener/i }).click();
    await expect(page.getByText(/Clip listo/)).toBeVisible({ timeout: 10_000 });
  });

  test("el clip listo (con reproductor de vídeo) no tiene violaciones", async ({ page }) => {
    await page.getByRole("button", { name: /Grabar clip/i }).click();
    await expect(page.getByText(/Grabando/)).toBeVisible();
    await page.getByRole("button", { name: /Detener/i }).click();
    await expect(page.getByText(/Clip listo/)).toBeVisible({ timeout: 10_000 });
    await expectNoViolations(page);
  });

  test("la foto capturada no tiene violaciones", async ({ page }) => {
    await page.getByRole("button", { name: "📷 Foto" }).click();
    await expect(page.getByText("Descargar foto")).toBeVisible();
    await expectNoViolations(page);
  });
});
