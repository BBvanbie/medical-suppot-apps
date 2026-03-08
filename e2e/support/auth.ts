import { expect, type Page } from "@playwright/test";

export async function loginAs(page: Page, credentials: { username: string; password: string }, callbackUrl = "/") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByTestId("login-username").fill(credentials.username);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
  } catch {
    const errorText = await page.locator("form").textContent();
    throw new Error(`Login failed for ${credentials.username}. URL=${page.url()} form=${errorText ?? ""}`);
  }
  await expect(page).not.toHaveURL(/\/login/);
}
