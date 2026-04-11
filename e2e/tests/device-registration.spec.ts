import { expect, test } from "@playwright/test";

import globalSetup from "../global-setup";
import { loginAs } from "../support/auth";
import { testHospitals, testTeams, testUsers } from "../support/test-data";

test.setTimeout(120_000);

test.beforeEach(async () => {
  await globalSetup();
});

test("ADMIN can issue a registration code and EMS can register the current device", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await loginAs(adminPage, testUsers.admin, "/admin/devices");
  const emsDeviceRow = adminPage.locator("button").filter({ hasText: "EMS-IPAD-001" }).first();
  await emsDeviceRow.click();

  await adminPage.getByLabel("端末ロール").selectOption("EMS");
  await adminPage.getByLabel("救急隊所属").selectOption({
    label: `${testTeams.teamA.name} (${testTeams.teamA.code})`,
  });
  await adminPage.getByRole("button", { name: "変更を保存" }).click();
  await adminPage.getByRole("button", { name: "保存する" }).click();
  await expect(adminPage.getByText("端末情報を更新しました。")).toBeVisible();

  await adminPage.getByTestId("admin-device-issue-registration-code").click();
  const registrationCode = (await adminPage.getByTestId("admin-device-issued-registration-code-value").textContent())?.trim();
  expect(registrationCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  const emsContext = await browser.newContext();
  const emsPage = await emsContext.newPage();

  await loginAs(emsPage, testUsers.emsA, "/settings/device");
  await expect(emsPage).toHaveURL(/\/register-device/);
  await emsPage.getByTestId("device-registration-code").fill(String(registrationCode));
  await emsPage.getByTestId("device-registration-submit").click();
  await emsPage.waitForURL((url) => url.pathname === "/paramedics" || url.pathname === "/login", { timeout: 15_000 });
  if (new URL(emsPage.url()).pathname === "/login") {
    await loginAs(emsPage, testUsers.emsA, "/paramedics");
  }
  await expect(emsPage).toHaveURL(/\/paramedics/);

  await adminContext.close();
  await emsContext.close();
});

test("ADMIN can issue a registration code and HOSPITAL can register the current device", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await loginAs(adminPage, testUsers.admin, "/admin/devices");
  const hospitalDeviceRow = adminPage.locator("button").filter({ hasText: "HP-TERM-001" }).first();
  await hospitalDeviceRow.click();

  await adminPage.getByLabel("端末ロール").selectOption("HOSPITAL");
  await adminPage.getByLabel("病院所属").selectOption({
    label: `${testHospitals.hospitalA} (H-990001)`,
  });
  await adminPage.getByRole("button", { name: "変更を保存" }).click();
  await adminPage.getByRole("button", { name: "保存する" }).click();
  await expect(adminPage.getByText("端末情報を更新しました。")).toBeVisible();

  await adminPage.getByTestId("admin-device-issue-registration-code").click();
  const registrationCode = (await adminPage.getByTestId("admin-device-issued-registration-code-value").textContent())?.trim();
  expect(registrationCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  const hospitalContext = await browser.newContext();
  const hospitalPage = await hospitalContext.newPage();

  await loginAs(hospitalPage, testUsers.hospitalA, "/hp/settings/device");
  await expect(hospitalPage).toHaveURL(/\/register-device/);
  await hospitalPage.getByTestId("device-registration-code").fill(String(registrationCode));
  await hospitalPage.getByTestId("device-registration-submit").click();
  await hospitalPage.waitForURL((url) => url.pathname === "/hospitals" || url.pathname === "/hospitals/requests" || url.pathname === "/login", {
    timeout: 15_000,
  });
  if (new URL(hospitalPage.url()).pathname === "/login") {
    await loginAs(hospitalPage, testUsers.hospitalA, "/hp/settings/device");
  }

  await hospitalPage.goto("/hp/settings/device");
  await expect(hospitalPage).toHaveURL(/\/hp\/settings\/device/);
  await expect(hospitalPage.getByRole("heading", { name: "現在の端末認証状態" })).toBeVisible();

  const deviceVerification = await hospitalPage.evaluate(async () => {
    const deviceKey = window.localStorage.getItem("security:device-key") ?? "";
    const [deviceResponse, mfaResponse] = await Promise.all([
      fetch("/api/security/device-status", {
        headers: { "x-device-key": deviceKey },
        cache: "no-store",
      }),
      fetch("/api/security/mfa/status", {
        cache: "no-store",
      }),
    ]);

    return {
      deviceStatus: await deviceResponse.json(),
      mfaStatus: await mfaResponse.json(),
    };
  });

  expect(deviceVerification.deviceStatus.deviceTrusted).toBe(true);
  expect(deviceVerification.mfaStatus.mfaEnrolled).toBe(true);

  await adminContext.close();
  await hospitalContext.close();
});
