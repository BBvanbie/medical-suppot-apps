import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testHospitals, testUsers } from "../support/test-data";

test("EMS only sees own team cases and can expand hospital targets", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");

  await expect(page.getByTestId("ems-cases-table")).toBeVisible();
  await expect(page.locator('[data-testid="ems-case-row"][data-case-id="E2E-CASE-EMS-A"]')).toBeVisible();
  await expect(page.locator('[data-testid="ems-case-row"][data-case-id="E2E-CASE-EMS-B"]')).toHaveCount(0);

  await page.locator('[data-testid="ems-case-row"][data-case-id="E2E-CASE-EMS-A"]').click();

  const targetRows = page.locator('[data-testid="ems-case-target-row"][data-case-id="E2E-CASE-EMS-A"]');
  await expect(targetRows).toHaveCount(2);
  await expect(page.getByText(testHospitals.hospitalA)).toBeVisible();
  await expect(page.getByText(testHospitals.hospitalB)).toBeVisible();
});

test("ADMIN sees all cases but case save API is forbidden", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin/cases");

  await expect(page.getByTestId("admin-cases-table")).toBeVisible();
  await expect(page.locator('[data-testid="admin-case-row"][data-case-id="E2E-CASE-EMS-A"]')).toBeVisible();
  await expect(page.locator('[data-testid="admin-case-row"][data-case-id="E2E-CASE-EMS-B"]')).toBeVisible();

  const response = await page.context().request.post("/api/cases", {
    data: {
      caseId: "E2E-ADMIN-FORBIDDEN",
      division: "1部",
      awareDate: "2026-03-08",
      awareTime: "12:00",
      patientName: "Forbidden",
      age: 30,
      address: "E2E address",
      casePayload: {},
    },
  });

  expect(response.status()).toBe(403);
});
