import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

async function setCurrentMode(page: Page, mode: "LIVE" | "TRAINING") {
  const response = await page.context().request.patch("/api/settings/user-mode", {
    data: { mode },
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.text();
  expect(response.ok(), `${response.status()}: ${body}`).toBeTruthy();
}

test("ADMIN training home shows control links and training summary", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, testUsers.admin, "/admin");

  try {
    await setCurrentMode(page, "TRAINING");
    await page.goto("/admin");

    await expect(page.getByTestId("admin-home-training-badge")).toBeVisible();
    await expect(page.getByTestId("admin-home-training-summary")).toBeVisible();
    await expect(page.getByTestId("admin-home-training-control")).toContainText("mode 切替 / reset");
    await expect(page.getByTestId("admin-home-training-control")).toContainText("TRAINING 監視");
    await expect(page.getByTestId("admin-home-training-routes")).toContainText("事案一覧");
  } finally {
    await setCurrentMode(page, "LIVE");
  }
});

test("HOSPITAL home switches between training guidance and live primary routes", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, testUsers.hospitalA, "/hospitals");

  try {
    await setCurrentMode(page, "TRAINING");
    await page.goto("/hospitals");

    await expect(page.getByTestId("hospital-home-training-steps")).toBeVisible();
    await expect(page.getByTestId("hospital-home-training-check")).toContainText("mode 切替");
    await expect(page.getByTestId("hospital-home-training-routes")).toContainText("受入要請一覧");

    await setCurrentMode(page, "LIVE");
    await page.goto("/hospitals");

    await expect(page.getByTestId("hospital-home-live-primary-routes")).toContainText("受入要請一覧");
    await expect(page.getByTestId("hospital-home-live-primary-routes")).toContainText("相談事案一覧");
    await expect(page.getByTestId("hospital-home-live-support-routes")).toContainText("運用モード");
    await expect(page.getByTestId("hospital-home-live-support-routes")).toContainText("サポート");
  } finally {
    await setCurrentMode(page, "LIVE");
  }
});

test("ADMIN can create and update compliance operating units", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, testUsers.admin, "/admin/settings/compliance");

  const uniqueCode = `shared_e2e_${Date.now()}`;
  const initialLabel = `E2E Shared ${Date.now()}`;
  const updatedLabel = `${initialLabel} Updated`;

  await page.goto("/admin/settings/compliance");
  await expect(page.getByTestId("compliance-operating-units")).toBeVisible();

  await page.getByTestId("operating-unit-scope").selectOption("shared");
  await page.getByTestId("operating-unit-code").fill(uniqueCode);
  await page.getByTestId("operating-unit-label").fill(initialLabel);
  await page.getByTestId("operating-unit-create").click();

  const row = page.locator(`[data-unit-code="${uniqueCode}"]`).first();
  await expect(row).toBeVisible();
  await expect(page.getByTestId(`operating-unit-display-code-${uniqueCode}`)).toHaveValue(initialLabel);
  await page.getByTestId(`operating-unit-display-code-${uniqueCode}`).fill(updatedLabel);
  await page.getByTestId(`operating-unit-active-${uniqueCode}`).uncheck();
  await page.getByTestId(`operating-unit-save-code-${uniqueCode}`).click();

  await expect(page.getByTestId(`operating-unit-display-code-${uniqueCode}`)).toHaveValue(updatedLabel);
  await expect(page.getByTestId(`operating-unit-active-${uniqueCode}`)).not.toBeChecked();

  const createdOperatingUnitId = await row.getAttribute("data-unit-id");
  expect(createdOperatingUnitId).toBeTruthy();
  await page.getByTestId("compliance-registry-search").fill(String(createdOperatingUnitId));
  await expect(page.getByTestId("compliance-registry-panel")).toContainText(`ID ${createdOperatingUnitId}`);
  await page.getByLabel("対象スコープ").selectOption("shared");
  await page.getByTestId("compliance-organization-search").fill(String(createdOperatingUnitId));
  await expect(page.getByTestId("compliance-organization-select")).toContainText(`ID ${createdOperatingUnitId}`);
});
