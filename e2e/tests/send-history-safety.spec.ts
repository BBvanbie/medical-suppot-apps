import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testHospitals, testUsers } from "../support/test-data";

async function createCase(page: Page, caseId: string) {
  const response = await page.context().request.post("/api/cases", {
    data: {
      caseId,
      division: "1方面",
      awareDate: "2026-04-01",
      awareTime: "14:00",
      patientName: "E2E Safety Patient",
      age: 52,
      address: "東京都千代田区E2E Safety 1-1-1",
      casePayload: {
        basic: {
          caseId,
          name: "E2E Safety Patient",
          gender: "male",
          age: 52,
          calculatedAge: 52,
          address: "東京都千代田区E2E Safety 1-1-1",
        },
      },
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function sendHospitalRequest(page: Page, caseId: string, requestId: string) {
  const response = await page.context().request.post("/api/cases/send-history", {
    data: {
      caseRef: caseId,
      item: {
        requestId,
        caseId,
        sentAt: new Date().toISOString(),
        hospitalCount: 1,
        hospitalNames: [testHospitals.hospitalA],
        hospitals: [
          {
            hospitalId: 990001,
            hospitalName: testHospitals.hospitalA,
            departments: ["内科"],
          },
        ],
        selectedDepartments: ["内科"],
        patientSummary: {
          name: "E2E Safety Patient",
          age: 52,
          address: "東京都千代田区E2E Safety 1-1-1",
        },
      },
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function findHospitalTargetByRequestId(page: Page, requestId: string) {
  const response = await page.context().request.get("/api/hospitals/requests");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return (data.rows ?? []).find(
    (row: { requestId?: string; targetId?: number | string }) =>
      row.requestId === requestId && Number.isFinite(Number(row.targetId)),
  ) as { requestId: string; targetId: number | string } | undefined;
}

test("terminal target state rejects hospital re-transition", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  const requestsResponse = await page.context().request.get("/api/hospitals/requests");
  expect(requestsResponse.ok()).toBeTruthy();
  const requestsData = await requestsResponse.json();
  const hospitalATarget = (requestsData.rows ?? []).find(
    (row: { caseId?: string; targetId?: number | string }) =>
      row.caseId === testCases.teamAVisible && Number.isFinite(Number(row.targetId)),
  );
  expect(hospitalATarget).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");

  const historyResponse = await page.context().request.get(
    `/api/cases/send-history?caseRef=${encodeURIComponent(testCases.teamAVisibleUid)}`,
  );
  expect(historyResponse.ok()).toBeTruthy();
  const historyData = await historyResponse.json();
  const acceptableTarget = (historyData.rows ?? []).find(
    (row: { rawStatus?: string; targetId?: number | string }) =>
      row.rawStatus === "ACCEPTABLE" && Number.isFinite(Number(row.targetId)),
  );
  expect(acceptableTarget).toBeTruthy();

  const decideResponse = await page.context().request.patch(
    `/api/cases/send-history/${acceptableTarget.targetId}/status`,
    {
      data: { nextStatus: "TRANSPORT_DECIDED" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(decideResponse.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  const retryResponse = await page.context().request.patch(
    `/api/hospitals/requests/${hospitalATarget.targetId}/status`,
    {
      data: { status: "ACCEPTABLE" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(retryResponse.status()).toBe(400);
  const retryPayload = await retryResponse.json();
  expect(retryPayload.message).toBe("Transition not allowed");
});

test("second transport decision for the same case returns conflict", async ({ page }) => {
  const caseId = `E2E-CONFLICT-${Date.now()}`;
  const requestId1 = `${caseId}-REQ-1`;
  const requestId2 = `${caseId}-REQ-2`;

  await loginAs(page, testUsers.emsA, "/cases/search");
  await createCase(page, caseId);
  await sendHospitalRequest(page, caseId, requestId1);

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  const firstTarget = await findHospitalTargetByRequestId(page, requestId1);
  expect(firstTarget).toBeTruthy();

  const firstAcceptResponse = await page.context().request.patch(
    `/api/hospitals/requests/${firstTarget!.targetId}/status`,
    {
      data: { status: "ACCEPTABLE" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(firstAcceptResponse.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");

  const firstDecisionResponse = await page.context().request.patch(
    `/api/cases/send-history/${firstTarget!.targetId}/status`,
    {
      data: { nextStatus: "TRANSPORT_DECIDED" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(firstDecisionResponse.ok()).toBeTruthy();

  await sendHospitalRequest(page, caseId, requestId2);

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  const secondTarget = await findHospitalTargetByRequestId(page, requestId2);
  expect(secondTarget).toBeTruthy();

  const secondAcceptResponse = await page.context().request.patch(
    `/api/hospitals/requests/${secondTarget!.targetId}/status`,
    {
      data: { status: "ACCEPTABLE" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(secondAcceptResponse.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");

  const conflictResponse = await page.context().request.patch(
    `/api/cases/send-history/${secondTarget!.targetId}/status`,
    {
      data: { nextStatus: "TRANSPORT_DECIDED" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(conflictResponse.status()).toBe(409);
  const conflictPayload = await conflictResponse.json();
  expect(conflictPayload.message).toBe("Transport has already been decided for this case.");
});
