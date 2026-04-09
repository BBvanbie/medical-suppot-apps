import { expect, test } from "@playwright/test";

import globalSetup from "../global-setup";
import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

const updatedDispatchPassword = "Passw0rd!23";

test.setTimeout(120_000);

test.beforeEach(async () => {
  await globalSetup();
});

test("ADMIN can unlock a locked account", async ({ browser, page }) => {
  await page.goto("/login");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByTestId("login-username").fill(testUsers.dispatch.username);
    await page.getByTestId("login-password").fill("WrongPassw0rd!");
    await page.getByTestId("login-submit").click();
  }
  await expect(page.getByText(/ログイン試行回数が上限/)).toBeVisible();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAs(adminPage, testUsers.admin, "/admin/users");
  await adminPage.locator("button").filter({ hasText: testUsers.dispatch.username }).first().click();
  await adminPage.getByRole("button", { name: "ロック解除" }).click();
  await expect(adminPage.getByText("ログインロックなし")).toBeVisible();
  await adminContext.close();

  await page.goto("/login");
  await page.getByTestId("login-username").fill(testUsers.dispatch.username);
  await page.getByTestId("login-password").fill(testUsers.dispatch.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/dispatch/, { timeout: 15_000 });
});

test("ADMIN can issue a temporary password and user is forced to change it", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAs(adminPage, testUsers.admin, "/admin/users");
  await adminPage.locator("button").filter({ hasText: testUsers.dispatch.username }).first().click();
  await adminPage.getByRole("button", { name: "一時PASS発行" }).click();
  const tempPassword = (await adminPage.getByTestId("admin-user-issued-temp-password").textContent())?.trim();
  expect(tempPassword).toBeTruthy();

  const dispatchContext = await browser.newContext();
  const dispatchPage = await dispatchContext.newPage();
  await loginAs(dispatchPage, { username: testUsers.dispatch.username, password: String(tempPassword) }, "/dispatch/new");
  await expect(dispatchPage).toHaveURL(/\/change-password/);
  await dispatchPage.getByLabel("現在のパスワード", { exact: true }).fill(String(tempPassword));
  await dispatchPage.getByLabel("新しいパスワード", { exact: true }).fill(updatedDispatchPassword);
  await dispatchPage.getByLabel("新しいパスワード確認", { exact: true }).fill(updatedDispatchPassword);
  await dispatchPage.getByRole("button", { name: "パスワードを変更" }).click();
  await expect(dispatchPage).toHaveURL(/\/login/, { timeout: 15_000 });
  await loginAs(dispatchPage, { username: testUsers.dispatch.username, password: updatedDispatchPassword }, "/dispatch/new");
  await expect(dispatchPage).toHaveURL(/\/dispatch/);

  await dispatchContext.close();
  await adminContext.close();
});
