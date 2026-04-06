import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

test("ADMIN dashboard drill-down opens filtered case workbench", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin");

  await page.getByRole("link", { name: "選定停滞" }).click();
  await expect(page).toHaveURL(/\/admin\/cases\?problem=selection_stalled/);
  await expect(page.getByTestId("admin-case-context-note")).toContainText("選定停滞");
});

test("HOSPITAL detail panel shows recent and next action guidance", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  const firstDetailButton = page.getByTestId("hospital-request-detail-button").first();
  await expect(firstDetailButton).toBeVisible();
  await firstDetailButton.click();

  await expect(page.getByTestId("hospital-request-detail-modal")).toBeVisible();
  await expect(page.getByText("直近 action")).toBeVisible();
  await expect(page.getByText("次に押せる action")).toBeVisible();
});
