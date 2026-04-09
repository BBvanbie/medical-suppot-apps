import { expect, type Page } from "@playwright/test";

export async function loginAs(page: Page, credentials: { username: string; password: string }, callbackUrl = "/") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByTestId("login-username").fill(credentials.username);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
  } catch {
    if (!page.url().includes("/login")) {
      return;
    }
    const errorText = await page.locator("form").textContent();
    throw new Error(`Login failed for ${credentials.username}. URL=${page.url()} form=${errorText ?? ""}`);
  }
  await expect(page).not.toHaveURL(/\/login/);

  const pinSetupHeading = page.getByRole("heading", { name: "この端末の PIN を設定" });
  await pinSetupHeading.waitFor({ state: "visible", timeout: 3000 }).catch(() => undefined);
  if (await pinSetupHeading.isVisible().catch(() => false)) {
    const pinInput = page.locator("#security-pin");
    const confirmInput = page.locator("#security-pin-confirm");
    const expectedPin = "111111";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await pinInput.fill("");
      await confirmInput.fill("");
      await pinInput.fill(expectedPin);
      await confirmInput.fill(expectedPin);
      const currentPin = await pinInput.inputValue();
      const currentConfirm = await confirmInput.inputValue();
      if (currentPin === expectedPin && currentConfirm === expectedPin) {
        break;
      }
      await page.waitForTimeout(150);
    }
    await expect(pinInput).toHaveValue(expectedPin);
    await expect(confirmInput).toHaveValue(expectedPin);
    await page.getByRole("button", { name: "PIN を設定" }).click();
    await expect(pinSetupHeading).toBeHidden({ timeout: 15_000 });
  }

  await page.waitForLoadState("networkidle").catch(() => undefined);
}
