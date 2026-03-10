import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

test("HOSPITAL can open consult view and send a consult comment", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/consults");

  await expect(page.getByTestId("hospital-consults-table")).toBeVisible();
  const consultRow = page.locator('[data-testid="hospital-consult-row"]').first();
  await expect(consultRow).toBeVisible();

  await consultRow.locator('[data-testid="hospital-consult-open-button"]').click();
  await expect(page.getByTestId("hospital-consult-view-modal")).toBeVisible();

  await page.getByRole("textbox").fill("E2E hospital consult note");
  await page.getByTestId("hospital-consult-send").click();
  await expect(page.getByText("E2E hospital consult note")).toBeVisible();
});

test("HOSPITAL can open request detail and send acceptable", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();
  const requestRow = page.locator('[data-testid="hospital-request-row"]').filter({ hasText: "E2E-CASE-EMS-A" }).first();
  await expect(requestRow).toBeVisible();

  await requestRow.locator('[data-testid="hospital-request-detail-button"]').click();
  await expect(page.getByTestId("hospital-request-detail-modal")).toBeVisible();

  await page.getByTestId("hospital-status-action-acceptable").click();
  await page.getByTestId("hospital-accept-confirm-ok").click();
  await expect(page.getByTestId("hospital-accept-success-title")).toBeVisible();
});
