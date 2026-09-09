import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/director");
  await page.getByRole("button", { name: /Encender cámara/i }).click();
  await expect(page.locator("video")).toBeVisible();
  // Arranque inmediato en las pruebas: sin esperar al micrófono ni a la
  // cuenta atrás, que ya tienen su propia prueba dedicada.
  await page.getByLabel("Con audio").uncheck();
  await page.getByLabel(/Cuenta atrás/).uncheck();
});

test("graba un clip y deja descargarlo ya recortado", async ({ page }) => {
  await page.getByRole("button", { name: /Grabar clip/i }).click();
  await expect(page.getByText(/Grabando/)).toBeVisible();

  await page.getByRole("button", { name: /Detener/i }).click();
  await expect(page.getByText(/Clip listo/)).toBeVisible({ timeout: 10_000 });

  const download = page.getByRole("link", { name: /Descargar/i });
  await expect(download).toHaveAttribute("href", /^blob:/);
  await expect(download).toHaveAttribute("download", /^directorscene-tiktok-.*\.webm$/);

  // Descartar vuelve al botón de grabar, sin dejar el clip "colgado" en pantalla.
  await page.getByRole("button", { name: /Descartar/i }).click();
  await expect(page.getByRole("button", { name: /Grabar clip/i })).toBeVisible();
});

test("la barra espaciadora graba y detiene; Esc descarta", async ({ page }) => {
  // Foco en la página, no en un control, para que el atajo global no compita
  // con el comportamiento nativo de ningún elemento.
  await page.locator("body").click({ position: { x: 5, y: 5 } });

  await page.keyboard.press("Space");
  await expect(page.getByText(/Grabando/)).toBeVisible({ timeout: 10_000 });
  // Un margen realista: nadie graba y detiene en el mismo instante. Sin
  // esto, MediaRecorder puede quedar en un estado transitorio raro al
  // detenerlo casi en el mismo tick en que arrancó.
  await page.waitForTimeout(500);

  await page.keyboard.press("Space");
  await expect(page.getByText(/Clip listo/)).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press("Escape");
  // La operación en sí (discard + re-render) es casi instantánea en
  // aislamiento; el margen generoso es por el navegador compartido entre
  // tests del mismo worker, que acumula trabajo de fondo (MediaPipe/WASM de
  // cada test anterior) y puede ralentizar el hilo principal bastante más
  // de lo que tardaría cualquiera de estos pasos por sí solo.
  await expect(page.getByRole("button", { name: /Grabar clip/i })).toBeVisible({
    timeout: 30_000,
  });
});

test("la cuenta atrás se puede cancelar antes de grabar de verdad", async ({ page }) => {
  await page.getByLabel(/Cuenta atrás/).check();
  await page.getByRole("button", { name: /Grabar clip/i }).click();
  await expect(page.getByText("Prepárate…")).toBeVisible();

  await page.getByRole("button", { name: /Cancelar/i }).click();
  await expect(page.getByRole("button", { name: /Grabar clip/i })).toBeVisible();
});

test("tras la cuenta atrás, empieza a grabar de verdad", async ({ page }) => {
  await page.getByLabel(/Cuenta atrás/).check();
  await page.getByRole("button", { name: /Grabar clip/i }).click();
  await expect(page.getByText("Prepárate…")).toBeVisible();

  // 3 s de cuenta atrás + el tiempo que tarde en cargar el motor de visión en
  // paralelo (comparte hilo principal con el temporizador); en CI o bajo
  // carga puede ser bastante más que los 3 s "de libro".
  await expect(page.getByText(/Grabando/)).toBeVisible({ timeout: 20_000 });
});

test("el tope de duración bloquea el cambio de plataforma mientras se graba", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Grabar clip/i }).click();
  await expect(page.getByText(/Grabando/)).toBeVisible();

  await expect(page.getByRole("button", { name: /^YouTube 16:9$/ })).toBeDisabled();
  await expect(page.getByText("Fijada mientras grabas.")).toBeVisible();

  await page.getByRole("button", { name: /Detener/i }).click();
  await expect(page.getByText(/Clip listo/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /^YouTube 16:9$/ })).toBeEnabled();
});
