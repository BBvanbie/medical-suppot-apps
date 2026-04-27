import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testHospitals, testTeams, testUsers } from "../support/test-data";

test.setTimeout(90_000);

test("DISPATCH can create cases for multiple assigned EMS teams", async ({ page }) => {
  const dispatchAddress = `東京都千代田区E2E Dispatch 複数隊 ${Date.now()}`;
  await loginAs(page, testUsers.dispatch, "/dispatch/new");

  await expect(page.getByRole("heading", { name: "指令起票" })).toBeVisible();
  await page.getByTestId("dispatch-team-division-filter").selectOption("1方面");
  await page.getByTestId("dispatch-team-search").fill(testTeams.teamA.name);
  await page.getByRole("checkbox", { name: new RegExp(testTeams.teamA.name) }).check();
  await page.getByTestId("dispatch-team-division-filter").selectOption("2方面");
  await page.getByTestId("dispatch-team-search").fill(testTeams.teamB.name);
  await expect(page.getByRole("checkbox", { name: new RegExp(testTeams.teamA.name) })).toHaveCount(0);
  await page.getByRole("checkbox", { name: new RegExp(testTeams.teamB.name) }).check();
  await page.getByLabel("覚知日付").fill("2026-03-24");
  await page.getByLabel("覚知時間").fill("09:45");
  await page.getByLabel("指令先住所").fill(dispatchAddress);
  await page.getByRole("button", { name: "送信" }).click();

  const successMessage = page.getByText(/2隊へ指令を起票しました。/);
  await expect(successMessage).toBeVisible();
  const successText = (await successMessage.textContent()) ?? "";
  const createdCaseIds = successText.match(/\d{8}-\d{3}-\d{2}/g) ?? [];
  expect(createdCaseIds).toHaveLength(2);

  await page.goto("/dispatch/cases");
  await expect(page.getByRole("heading", { name: "指令一覧" })).toBeVisible();
  for (const caseId of createdCaseIds) {
    await expect(page.getByText(caseId)).toBeVisible();
  }

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");
  await expect(page.getByTestId("ems-cases-table")).toBeVisible();
  await expect(page.getByText(dispatchAddress)).toBeVisible();

  await page.getByTestId("ems-case-row").filter({ hasText: dispatchAddress }).first().getByRole("button", { name: "詳細" }).click();
  await expect(page).toHaveURL(/\/cases\/case_/, { timeout: 30_000 });
  await expect(page.getByLabel("指令先住所")).toHaveValue(dispatchAddress);

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsB, "/cases/search");
  await expect(page.getByTestId("ems-cases-table")).toBeVisible();
  await expect(page.getByText(dispatchAddress)).toBeVisible();
});

test("HOSPITAL user cannot access dispatch APIs", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals");

  const response = await page.context().request.get("/api/dispatch/cases");
  expect(response.status()).toBe(403);
});

test("critical care selection is routed EMS to DISPATCH to HOSPITAL to DISPATCH to EMS", async ({ page }) => {
  const requestId = `E2E-DISPATCH-CRITICAL-${Date.now()}`;

  await loginAs(page, testUsers.emsA, "/cases/search");
  const emsRequest = await page.context().request.post("/api/cases/dispatch-selection-requests", {
    data: {
      caseId: testCases.teamAVisible,
      item: {
        requestId,
        sentAt: new Date().toISOString(),
        selectedDepartments: ["救命"],
        searchMode: "or",
        hospitals: [{ hospitalName: testHospitals.hospitalA, departments: ["救命"] }],
        patientSummary: {
          caseId: testCases.teamAVisible,
          chiefComplaint: "E2E 救命本部選定",
          dispatchSummary: "救命選定のため本部へ依頼",
        },
      },
    },
  });
  expect(emsRequest.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.dispatch, "/dispatch/selection-requests");
  await expect(page.getByText(testCases.teamAVisible)).toBeVisible();
  await expect(page.getByText("救命・CCU本部選定").first()).toBeVisible();

  const dispatchHospitalRequest = await page.context().request.post(
    `/api/dispatch/cases/${encodeURIComponent(testCases.teamAVisible)}/hospital-requests`,
    {
      data: {
        selectedDepartments: ["救命"],
        hospitals: [{ hospitalName: testHospitals.hospitalA, departments: ["救命"] }],
      },
    },
  );
  expect(dispatchHospitalRequest.ok()).toBeTruthy();
  const dispatchHospitalData = (await dispatchHospitalRequest.json()) as { rows?: Array<{ targetId: number; requestId: string }> };
  const targetId = dispatchHospitalData.rows?.find((row) => row.requestId !== requestId)?.targetId ?? dispatchHospitalData.rows?.[0]?.targetId;
  expect(targetId).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
  const hospitalAccept = await page.context().request.patch(`/api/hospitals/requests/${targetId}/status`, {
    data: { status: "ACCEPTABLE", note: "E2E 受入可能" },
  });
  expect(hospitalAccept.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.dispatch, "/dispatch/selection-requests");
  const assignment = await page.context().request.patch(
    `/api/dispatch/cases/${encodeURIComponent(testCases.teamAVisible)}/assignment`,
    {
      data: {
        sourceTargetId: targetId,
        targetCaseIds: [testCases.teamAVisible],
      },
    },
  );
  expect(assignment.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/selection-requests");
  const history = await page.context().request.get(
    `/api/cases/send-history?caseRef=${encodeURIComponent(testCases.teamAVisible)}&targetId=${targetId}`,
  );
  expect(history.ok()).toBeTruthy();
  const historyData = (await history.json()) as { row?: { canDecide?: boolean; rawStatus?: string; hospitalName?: string } };
  expect(historyData.row?.canDecide).toBe(true);
  expect(historyData.row?.rawStatus).toBe("ACCEPTABLE");
  expect(historyData.row?.hospitalName).toBe(testHospitals.hospitalA);

  const decision = await page.context().request.patch(`/api/paramedics/requests/${targetId}/decision`, {
    data: { status: "TRANSPORT_DECIDED" },
  });
  expect(decision.ok()).toBeTruthy();
});
