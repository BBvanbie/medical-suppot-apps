import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testHospitals, testUsers } from "../support/test-data";

test("EMS only sees own team cases and can expand hospital targets", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");
  await expect
    .poll(async () => {
      const response = await page.context().request.get("/api/cases/search?limit=200");
      if (!response.ok()) return false;
      const data = await response.json();
      return (data.rows ?? []).some((row: { caseId?: string }) => row.caseId === testCases.teamAVisible);
    })
    .toBeTruthy();
  await page.getByRole("button", { name: "更新" }).click();

  await expect(page.getByTestId("ems-cases-table")).toBeVisible();
  await expect(page.locator('[data-testid="ems-case-row"][data-case-id="E2E-CASE-EMS-A"]')).toBeVisible();
  await expect(page.locator('[data-testid="ems-case-row"][data-case-id="E2E-CASE-EMS-B"]')).toHaveCount(0);

  await page.locator('[data-testid="ems-case-row"][data-case-id="E2E-CASE-EMS-A"]').click();

  const targetRows = page.locator('[data-testid="ems-case-target-row"][data-case-id="E2E-CASE-EMS-A"]');
  await expect(targetRows).toHaveCount(2);
  await expect(page.getByRole("heading", { name: testHospitals.hospitalA, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: testHospitals.hospitalB, exact: true })).toBeVisible();
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

test("EMS cannot read or update another team's case target", async ({ page }) => {
  await loginAs(page, testUsers.emsB, "/cases/search");

  const ownHistoryResponse = await page.context().request.get(
    `/api/cases/send-history?caseRef=${encodeURIComponent(testCases.teamBHiddenUid)}`,
  );
  expect(ownHistoryResponse.ok()).toBeTruthy();
  const ownHistoryData = await ownHistoryResponse.json();
  const otherTeamTarget = (ownHistoryData.rows ?? []).find(
    (row: { targetId?: number | string }) => Number.isFinite(Number(row.targetId)),
  );
  expect(otherTeamTarget).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");

  const readResponse = await page.context().request.get(
    `/api/cases/send-history?caseRef=${encodeURIComponent(testCases.teamBHiddenUid)}`,
  );
  expect(readResponse.status()).toBe(404);

  const updateResponse = await page.context().request.patch(
    `/api/paramedics/requests/${otherTeamTarget.targetId}/decision`,
    {
      data: {
        status: "TRANSPORT_DECLINED",
        reasonCode: "PATIENT_CIRCUMSTANCES",
      },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(updateResponse.status()).toBe(404);
});

test("HOSPITAL cannot update another hospital's target", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");
  await expect
    .poll(async () => {
      const response = await page.context().request.get(
        `/api/cases/send-history?caseRef=${encodeURIComponent(testCases.teamAVisibleUid)}`,
      );
      return response.status();
    })
    .toBe(200);

  const historyResponse = await page.context().request.get(
    `/api/cases/send-history?caseRef=${encodeURIComponent(testCases.teamAVisibleUid)}`,
  );
  expect(historyResponse.ok()).toBeTruthy();
  const historyData = await historyResponse.json();
  const otherHospitalTarget = (historyData.rows ?? []).find(
    (row: { hospitalName?: string; targetId?: number | string }) =>
      row.hospitalName === testHospitals.hospitalB && Number.isFinite(Number(row.targetId)),
  );
  expect(otherHospitalTarget).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  const response = await page.context().request.patch(
    `/api/hospitals/requests/${otherHospitalTarget.targetId}/status`,
    {
      data: { status: "READ" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(response.status()).toBe(404);
});
