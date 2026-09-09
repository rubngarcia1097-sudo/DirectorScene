import { expect, test } from "@playwright/test";

test("detecta la cámara y activa el módulo de laptop al marcarlo a mano", async ({
  page,
}) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();

  await page.getByRole("button", { name: /Calidad de grabación/i }).click();
  // El fake device de Chromium no delata marca: sin marcar la casilla, la
  // fuente queda sin identificar. El texto aparece tanto en el resumen del
  // botón como en el detalle (<dd>); solo el segundo es exacto.
  await expect(
    page.getByText("Cámara de escritorio (sin identificar)", { exact: true }),
  ).toBeVisible();

  await page.getByLabel(/Uso la cámara integrada de mi laptop/i).check();
  await expect(page.getByText("Eleva la laptop a la altura de los ojos")).toBeVisible();
  await expect(
    page.getByText("Webcam integrada de laptop", { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /Cambiar a horizontal/i }),
  ).toBeVisible();
});
