import { expect, type Page } from "@playwright/test";

export async function loginAs(page: Page, credentials: { username: string; password: string }, callbackUrl = "/") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByTestId("login-username").fill(credentials.username);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/login/);
}
