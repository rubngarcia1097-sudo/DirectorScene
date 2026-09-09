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
