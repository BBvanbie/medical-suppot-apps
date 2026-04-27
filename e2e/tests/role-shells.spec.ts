import { expect, test, type Browser, type Page } from "@playwright/test";

import globalSetup from "../global-setup";
import { loginAs } from "../support/auth";
import { testTeams, testUsers } from "../support/test-data";

test.setTimeout(120_000);

test.beforeEach(async () => {
  await globalSetup();
});

async function issueEmsRegistrationCode(browser: Browser) {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAs(adminPage, testUsers.admin, "/admin/devices");

  const emsDeviceRow = adminPage.locator("button").filter({ hasText: "EMS-IPAD-001" }).first();
  await emsDeviceRow.click();
  await adminPage.getByLabel("端末ロール").selectOption("EMS");
  await adminPage.getByLabel("救急隊所属").selectOption({
    label: `${testTeams.teamA.name} (${testTeams.teamA.code})`,
  });
  const saveButton = adminPage.getByRole("button", { name: "変更を保存" });
  if (await saveButton.isEnabled()) {
    await saveButton.click();
    await adminPage.getByRole("button", { name: "保存する" }).click();
    await expect(adminPage.getByText("端末情報を更新しました。")).toBeVisible();
  }

  await adminPage.getByTestId("admin-device-issue-registration-code").click();
  const registrationCode = (await adminPage.getByTestId("admin-device-issued-registration-code-value").textContent())?.trim();
  await adminContext.close();
  expect(registrationCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  return String(registrationCode);
}

async function completeEmsRegistrationIfNeeded(page: Page, registrationCode: string) {
  if (!page.url().includes("/register-device")) return;
  await page.getByTestId("device-registration-code").fill(registrationCode);
  await page.getByTestId("device-registration-submit").click();
  await page.waitForURL((url) => url.pathname === "/settings/sync" || url.pathname === "/paramedics" || url.pathname === "/login", {
    timeout: 15_000,
  });
  if (new URL(page.url()).pathname === "/login") {
    await loginAs(page, testUsers.emsA, "/settings/sync");
  } else if (new URL(page.url()).pathname === "/paramedics") {
    await page.goto("/settings/sync");
  }
}

test("EMS settings pages render the workbench header and key actions", async ({ browser, page }) => {
  const registrationCode = await issueEmsRegistrationCode(browser);
  await loginAs(page, testUsers.emsA, "/settings/sync");
  await completeEmsRegistrationIfNeeded(page, registrationCode);

  await expect(page.getByRole("heading", { name: "同期設定" })).toBeVisible();
  await expect(page.getByText("SETTINGS WORKBENCH")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "未送信キューを開く" }).first()).toBeVisible();

  await page.goto("/settings/support");
  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();
  await expect(page.getByText("SETTINGS WORKBENCH")).toBeVisible();
  await expect(page.getByText("操作マニュアル")).toBeVisible();
});

test("HOSPITAL settings pages render the workbench header and read-only support info", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hp/settings/support");

  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();
  await expect(page.getByText("SETTINGS WORKBENCH")).toBeVisible();
  await expect(page.getByText("問い合わせ窓口")).toBeVisible();

  await page.goto("/hp/settings/facility");
  await expect(page.getByRole("heading", { name: "施設情報" })).toBeVisible();
  await expect(page.getByText("管理対象情報")).toBeVisible();
  await expect(page.getByText("運用向け補足情報")).toBeVisible();
});

test("DISPATCH pages render the updated workbench header on create and list routes", async ({ page }) => {
  await loginAs(page, testUsers.dispatch, "/dispatch/new");

  await expect(page.getByRole("heading", { name: "指令起票" })).toBeVisible();
  await expect(page.getByText("DISPATCH WORKBENCH")).toBeVisible();
  await expect(page.getByText("DISPATCH FLOW")).toBeVisible();

  await page.goto("/dispatch/cases");
  await expect(page.getByRole("heading", { name: "指令一覧" })).toBeVisible();
  await expect(page.getByText("DISPATCH LOG")).toBeVisible();
  await expect(page.getByText("COMMAND HISTORY")).toBeVisible();

  await page.goto("/dispatch/active-cases");
  await expect(page.getByRole("heading", { name: "事案一覧" })).toBeVisible();
  await expect(page.getByText("ACTIVE CASES")).toBeVisible();

  await page.goto("/dispatch/selection-requests");
  await expect(page.getByRole("heading", { name: "選定依頼一覧" })).toBeVisible();
  await expect(page.getByText("SELECTION REQUESTS")).toBeVisible();
});
