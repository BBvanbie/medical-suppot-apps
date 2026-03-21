import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testHospitals, testUsers } from "../support/test-data";

test("ADMIN case list keeps only one expanded child row at a time", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin/cases");

  const caseARow = page.locator(`[data-testid="admin-case-row"][data-case-id="${testCases.teamAVisible}"]`);
  const caseBRow = page.locator(`[data-testid="admin-case-row"][data-case-id="${testCases.teamBHidden}"]`);
  const caseAPanel = page.locator(`[data-testid="admin-case-history-panel"][data-case-id="${testCases.teamAVisible}"]`);
  const caseBPanel = page.locator(`[data-testid="admin-case-history-panel"][data-case-id="${testCases.teamBHidden}"]`);

  await caseARow.click();
  await expect(page.locator(`[data-testid="admin-case-history-row"][data-case-id="${testCases.teamAVisible}"]`)).toHaveCount(2);
  await expect(caseAPanel).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByText(testHospitals.hospitalA)).toBeVisible();

  await caseBRow.click();
  await expect(page.locator(`[data-testid="admin-case-history-row"][data-case-id="${testCases.teamBHidden}"]`)).toHaveCount(1);
  await expect(caseAPanel).toHaveAttribute("aria-hidden", "true");
  await expect(caseBPanel).toHaveAttribute("aria-hidden", "false");
});

test("ADMIN detail modal shows patient summary and selection history tabs", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin/cases");

  await page.locator(`[data-testid="admin-case-detail-button"][data-case-id="${testCases.teamAVisible}"]`).click();

  await expect(page.getByText("CASE DETAIL")).toBeVisible();
  await expect(page.getByRole("button", { name: "患者サマリー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "選定履歴" })).toBeVisible();
  await expect(page.getByText("基本情報")).toBeVisible();
  await expect(page.getByText("状態変化サマリー")).toBeVisible();

  await page.getByRole("button", { name: "選定履歴" }).click();
  await expect(page.getByText(testHospitals.hospitalA)).toBeVisible();
  await expect(page.getByText(testHospitals.hospitalB)).toBeVisible();
});
