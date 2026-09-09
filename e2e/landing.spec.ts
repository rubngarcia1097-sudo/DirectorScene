import { expect, test } from "@playwright/test";

test("la landing muestra el mensaje principal y enlaza al estudio", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Te dirige mientras grabas/i }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Abrir el estudio/i }).click();
  await expect(page).toHaveURL(/\/director$/);
});
