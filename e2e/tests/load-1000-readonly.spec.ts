import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

const loadCases = {
  adminLatest: "LOAD-CASE-20260401-011",
  dispatchOrigin: "LOAD-CASE-20260401-091",
};

test("ADMIN can browse the 1000-case load dataset without layout loss", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin/cases");

  await expect(page.getByRole("heading", { name: "事案一覧" })).toBeVisible();
  await expect(page.getByTestId("admin-cases-table")).toBeVisible();
  await expect(page.getByTestId("admin-case-row")).toHaveCount(300);

  const loadRow = page.locator(`[data-testid="admin-case-row"][data-case-id="${loadCases.adminLatest}"]`);
  await expect(loadRow).toBeVisible();

  await page.locator(`[data-testid="admin-case-detail-button"][data-case-id="${loadCases.adminLatest}"]`).click();
  await expect(page.locator(`[data-testid="admin-case-detail-button"][data-case-id="${loadCases.adminLatest}"]`)).toHaveText(
    "詳細表示中",
  );
  await expect(page.getByRole("button", { name: "患者サマリー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "選定履歴" })).toBeVisible();
});

test("DISPATCH can see dispatch-origin load cases in the list", async ({ page }) => {
  await loginAs(page, testUsers.dispatch, "/dispatch/cases");

  await expect(page.getByRole("heading", { name: "指令一覧" })).toBeVisible();
  await expect(page.getByText("DISPATCH WORKBENCH")).toBeVisible();
  const dispatchRow = page.getByRole("row").filter({ hasText: loadCases.dispatchOrigin });
  await expect(dispatchRow).toBeVisible();
  await expect(dispatchRow.getByRole("cell", { name: "千代田区霞が関1-1-7" })).toBeVisible();
});
