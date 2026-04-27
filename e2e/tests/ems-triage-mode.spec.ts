import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testHospitals, testUsers } from "../support/test-data";

async function setCurrentMode(page: Page, mode: "LIVE" | "TRAINING") {
  const response = await page.context().request.patch("/api/settings/user-mode", {
    data: { mode },
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.text();
  expect(response.ok(), `${response.status()}: ${body}`).toBeTruthy();
}

async function setOperationalMode(page: Page, operationalMode: "STANDARD" | "TRIAGE") {
  const response = await page.context().request.patch("/api/settings/ambulance/operational-mode", {
    data: { operationalMode },
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
  });
  const body = await response.text();
  expect(response.ok(), `${response.status()}: ${body}`).toBeTruthy();
}

async function readJson<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}

async function createTriageDispatchReport(page: Page, address: string, memo: string) {
  await page.goto("/cases/new");
  await expect(page.getByTestId("ems-case-triage-note")).toBeVisible();
  await page.getByLabel("指令先住所").fill(address);
  await page.getByRole("button", { name: "最小バイタル" }).click();
  await page.getByLabel("主訴・観察メモ").fill(memo);
  await page.getByRole("button", { name: "本部へ報告" }).click();
  await page.waitForURL(/\/cases\/search/);
}

test("EMS can switch triage mode from home and keep it after reload", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, testUsers.emsA, "/paramedics");

  try {
    await setCurrentMode(page, "LIVE");
    await setOperationalMode(page, "STANDARD");
    await page.goto("/paramedics");

    await expect(page.getByTestId("ems-home-operational-badge")).toContainText("STANDARD");
    await page.getByTestId("ems-home-operational-toggle").getByRole("button", { name: "TRIAGE" }).click();
    await expect(page.getByTestId("ems-home-operational-badge")).toContainText("TRIAGE");
    await expect(page.getByTestId("ems-triage-banner")).toBeVisible();
    await expect(page.getByTestId("ems-home-priority-links")).toContainText("新規事案作成");
    await expect(page.getByTestId("ems-home-priority-links")).toContainText("送信履歴");

    await page.reload();
    await expect(page.getByTestId("ems-home-operational-badge")).toContainText("TRIAGE");
    await expect(page.getByTestId("ems-triage-banner")).toBeVisible();

    await page.goto("/cases/new");
    await expect(page.getByTestId("ems-case-triage-note")).toBeVisible();

    await page.goto("/settings/mode");
    await expect(page.getByText("トリアージ運用")).toBeVisible();
    await expect(page.getByText("STANDARD / TRIAGE")).toBeVisible();

    await setOperationalMode(page, "STANDARD");
    await page.goto(`/cases/${testCases.teamAVisibleUid}`);

    await expect(page.getByTestId("ems-case-detail-first-look")).toContainText(testCases.teamAVisible);
    await expect(page.getByTestId("ems-case-triage-note")).toHaveCount(0);
    await page.getByTestId("ems-case-detail-triage-switch").click();
    await expect(page.getByTestId("ems-case-triage-note")).toBeVisible();
    await expect(page.getByTestId("ems-case-detail-triage-switch-message")).toContainText("トリアージモードへ切り替えました");
    await expect(page.getByRole("button", { name: "本部へ報告" })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("ems-case-triage-note")).toBeVisible();
  } finally {
    await setOperationalMode(page, "STANDARD");
    await setCurrentMode(page, "LIVE");
  }
});

test("dispatch triage safeguards reject normal cases and capacity overflow atomically", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, testUsers.emsA, "/cases/new");

  try {
    await setCurrentMode(page, "LIVE");
    await setOperationalMode(page, "TRIAGE");
    const dispatchAddress = `新宿区西新宿2-8-1 TRIAGE-BULK-${Date.now()}`;
    await createTriageDispatchReport(page, dispatchAddress, "多数傷病者の第一報 A");
    await createTriageDispatchReport(page, dispatchAddress, "多数傷病者の第一報 B");
    await setOperationalMode(page, "STANDARD");

    await page.context().clearCookies();
    await loginAs(page, testUsers.dispatch, "/dispatch/active-cases");

    const normalCaseRequest = await page.context().request.post("/api/dispatch/cases/E2E-CASE-EMS-A/hospital-requests", {
      data: {
        hospitals: [{ hospitalId: 990001, hospitalName: testHospitals.hospitalA, departments: ["内科"] }],
        selectedDepartments: ["内科"],
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(normalCaseRequest.status()).toBe(400);

    const dispatchRowsResponse = await page.context().request.get("/api/dispatch/cases");
    expect(dispatchRowsResponse.ok()).toBeTruthy();
    const dispatchRowsData = await readJson<{
      rows?: Array<{ caseId: string; dispatchAddress: string; destination?: string | null }>;
    }>(dispatchRowsResponse);
    const dispatchCases = (dispatchRowsData.rows ?? []).filter((row) => row.dispatchAddress === dispatchAddress);
    expect(dispatchCases.length).toBeGreaterThanOrEqual(2);
    const targetCaseIds = dispatchCases.slice(0, 2).map((row) => row.caseId);

    const requestResponse = await page.context().request.post(
      `/api/dispatch/cases/${encodeURIComponent(targetCaseIds[0])}/hospital-requests`,
      {
        data: {
          hospitals: [{ hospitalId: 990001, hospitalName: testHospitals.hospitalA, departments: ["内科"] }],
          selectedDepartments: ["内科"],
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(requestResponse.ok(), await requestResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
    const hospitalRowsResponse = await page.context().request.get("/api/hospitals/requests");
    expect(hospitalRowsResponse.ok()).toBeTruthy();
    const hospitalRowsData = await readJson<{
      rows?: Array<{ caseId: string; targetId: number; status: string }>;
    }>(hospitalRowsResponse);
    const hospitalTarget = (hospitalRowsData.rows ?? []).find((row) => row.caseId === targetCaseIds[0]);
    expect(hospitalTarget).toBeTruthy();

    const missingCapacityResponse = await page.context().request.patch(`/api/hospitals/requests/${hospitalTarget!.targetId}/status`, {
      data: { status: "ACCEPTABLE" },
      headers: { "Content-Type": "application/json" },
    });
    expect(missingCapacityResponse.status()).toBe(400);

    const acceptResponse = await page.context().request.patch(`/api/hospitals/requests/${hospitalTarget!.targetId}/status`, {
      data: { status: "ACCEPTABLE", acceptedCapacity: 1 },
      headers: { "Content-Type": "application/json" },
    });
    expect(acceptResponse.ok(), await acceptResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.dispatch, "/dispatch/active-cases");
    const overflowResponse = await page.context().request.patch(
      `/api/dispatch/cases/${encodeURIComponent(targetCaseIds[0])}/assignment`,
      {
        data: { sourceTargetId: hospitalTarget!.targetId, targetCaseIds },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(overflowResponse.status()).toBe(409);

    const afterRowsResponse = await page.context().request.get("/api/dispatch/cases");
    expect(afterRowsResponse.ok()).toBeTruthy();
    const afterRowsData = await readJson<{
      rows?: Array<{ caseId: string; destination?: string | null }>;
    }>(afterRowsResponse);
    const afterTargets = (afterRowsData.rows ?? []).filter((row) => targetCaseIds.includes(row.caseId));
    expect(afterTargets.every((row) => !row.destination)).toBeTruthy();
  } finally {
    await setOperationalMode(page, "STANDARD").catch(() => undefined);
    await setCurrentMode(page, "LIVE").catch(() => undefined);
  }
});

test("EMS training and triage indicators can coexist", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, testUsers.emsA, "/paramedics");

  try {
    await setCurrentMode(page, "TRAINING");
    await setOperationalMode(page, "TRIAGE");
    await page.goto("/paramedics");

    await expect(page.getByText("訓練モードでは本番集計を表示しません")).toBeVisible();
    await expect(page.getByTestId("ems-triage-banner")).toBeVisible();
    await expect(page.getByTestId("ems-home-operational-badge")).toContainText("TRIAGE");
  } finally {
    await setOperationalMode(page, "STANDARD");
    await setCurrentMode(page, "LIVE");
  }
});

test("EMS triage case flow can report to dispatch with minimum inputs", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, testUsers.emsA, "/cases/new");
  let operationalModeReset = false;

  try {
    await setCurrentMode(page, "LIVE");
    await setOperationalMode(page, "TRIAGE");
    await page.goto("/cases/new");

    const dispatchAddress = `新宿区西新宿2-8-1 TRIAGE-${Date.now()}`;
    await expect(page.getByTestId("ems-case-triage-note")).toBeVisible();
    await page.getByLabel("指令先住所").fill(dispatchAddress);
    await page.getByRole("button", { name: "最小バイタル" }).click();
    await page.getByLabel("主訴・観察メモ").fill("多数傷病者の一次トリアージ報告");
    await page.getByRole("button", { name: "本部へ報告" }).click();

    await page.waitForURL(/\/cases\/search/);
    await setOperationalMode(page, "STANDARD");
    operationalModeReset = true;
    await page.context().clearCookies();
    await loginAs(page, testUsers.dispatch, "/dispatch/active-cases");

    const dispatchRowsResponse = await page.context().request.get("/api/dispatch/cases");
    expect(dispatchRowsResponse.ok()).toBeTruthy();
    const dispatchRowsData = await readJson<{
      rows?: Array<{ caseId: string; dispatchAddress: string }>;
    }>(dispatchRowsResponse);
    const dispatchCase = (dispatchRowsData.rows ?? []).find((row) => row.dispatchAddress === dispatchAddress);
    expect(dispatchCase).toBeTruthy();

    const requestResponse = await page.context().request.post(
      `/api/dispatch/cases/${encodeURIComponent(dispatchCase!.caseId)}/hospital-requests`,
      {
        data: {
          hospitals: [
            {
              hospitalId: 990001,
              hospitalName: testHospitals.hospitalA,
              departments: ["内科"],
            },
          ],
          selectedDepartments: ["内科"],
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(requestResponse.ok(), await requestResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
    const hospitalRowsResponse = await page.context().request.get("/api/hospitals/requests");
    expect(hospitalRowsResponse.ok()).toBeTruthy();
    const hospitalRowsData = await readJson<{
      rows?: Array<{ caseId: string; targetId: number; hospitalName?: string; status: string }>;
    }>(hospitalRowsResponse);
    const hospitalTarget = (hospitalRowsData.rows ?? []).find((row) => row.caseId === dispatchCase!.caseId);
    expect(hospitalTarget).toBeTruthy();

    const acceptResponse = await page.context().request.patch(`/api/hospitals/requests/${hospitalTarget!.targetId}/status`, {
      data: { status: "ACCEPTABLE", acceptedCapacity: 1 },
      headers: { "Content-Type": "application/json" },
    });
    expect(acceptResponse.ok(), await acceptResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.dispatch, "/dispatch/active-cases");
    const reportCard = page.locator("article").filter({ hasText: dispatchAddress }).first();
    await expect(reportCard).toContainText("TRIAGE本部報告");
    await expect(reportCard).toContainText(testHospitals.hospitalA);
    await expect(reportCard).toContainText("受入可能 1名");
    await reportCard.getByRole("button", { name: "選択EMSへ送信" }).click();
    await expect(reportCard).toContainText("1隊へ受入可能病院を送信しました。");

    await page.context().clearCookies();
    await loginAs(page, testUsers.emsA, "/cases/search");
    const historyResponse = await page.context().request.get(
      `/api/cases/send-history?caseRef=${encodeURIComponent(dispatchCase!.caseId)}`,
    );
    expect(historyResponse.ok()).toBeTruthy();
    const historyData = await readJson<{
      rows?: Array<{ targetId: number; hospitalName?: string; rawStatus?: string; canDecide?: boolean }>;
    }>(historyResponse);
    const acceptableTarget = (historyData.rows ?? []).find(
      (row) => row.hospitalName === testHospitals.hospitalA && row.rawStatus === "ACCEPTABLE" && row.canDecide === true,
    );
    expect(acceptableTarget).toBeTruthy();

    const decisionResponse = await page.context().request.patch(
      `/api/cases/send-history/${acceptableTarget!.targetId}/status`,
      {
        data: { nextStatus: "TRANSPORT_DECIDED" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(decisionResponse.ok(), await decisionResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
    const decidedRowsResponse = await page.context().request.get("/api/hospitals/requests");
    expect(decidedRowsResponse.ok()).toBeTruthy();
    const decidedRowsData = await readJson<{
      rows?: Array<{ targetId: number; status: string }>;
    }>(decidedRowsResponse);
    expect(decidedRowsData.rows?.find((row) => row.targetId === hospitalTarget!.targetId)?.status).toBe("TRANSPORT_DECIDED");
  } finally {
    if (!operationalModeReset) {
      await setOperationalMode(page, "STANDARD").catch(() => undefined);
    }
    await setCurrentMode(page, "LIVE").catch(() => undefined);
  }
});
