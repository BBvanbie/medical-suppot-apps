import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testUsers } from "../support/test-data";

test("HOSPITAL consult comment emits EMS notification with case identity", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/consults");

  await expect(page.getByTestId("hospital-consults-table")).toBeVisible();
  const consultRow = page.locator('[data-testid="hospital-consult-row"]').first();
  await expect(consultRow).toBeVisible();

  const targetId = Number(await consultRow.getAttribute("data-target-id"));
  expect(Number.isFinite(targetId)).toBeTruthy();

  const consultResponse = await page.context().request.patch(`/api/hospitals/requests/${targetId}/consult`, {
    data: { note: "E2E hospital consult note" },
    headers: { "Content-Type": "application/json" },
  });
  expect(consultResponse.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");

  const notificationsResponse = await page.context().request.get("/api/notifications?limit=100");
  expect(notificationsResponse.ok()).toBeTruthy();
  const notificationsData = await notificationsResponse.json();
  const matchingItem = (notificationsData.items ?? []).find(
    (item: { kind?: string; caseId?: string | null; caseUid?: string | null }) =>
      item.kind === "consult_status_changed"
      && item.caseId === testCases.teamAVisible
      && item.caseUid === testCases.teamAVisibleUid,
  );
  expect(matchingItem).toBeTruthy();
});

test("HOSPITAL request detail shows patient summary", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();
  const requestRow = page.locator('[data-testid="hospital-request-row"]').filter({ hasText: testCases.teamAVisible }).first();
  await expect(requestRow).toBeVisible();

  await requestRow.locator('[data-testid="hospital-request-detail-button"]').click();
  await expect(page.getByTestId("hospital-request-detail-modal")).toBeVisible();
  await expect(page.getByText("PATIENT SUMMARY")).toBeVisible();
  await expect(page.getByText("基本情報")).toBeVisible();
  await expect(page.getByText("状態変化サマリー")).toBeVisible();
});

test("EMS send-history accepts caseRef and transport decision updates hospital patients", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");

  const historyResponse = await page.context().request.get(
    `/api/cases/send-history?caseRef=${encodeURIComponent(testCases.teamAVisibleUid)}`,
  );
  expect(historyResponse.ok()).toBeTruthy();
  const historyData = await historyResponse.json();
  const acceptableTarget = (historyData.rows ?? []).find(
    (row: { rawStatus?: string; caseId?: string; caseUid?: string; targetId?: number }) =>
      row.rawStatus === "ACCEPTABLE"
      && row.caseId === testCases.teamAVisible
      && row.caseUid === testCases.teamAVisibleUid,
  );
  expect(acceptableTarget).toBeTruthy();

  const decisionResponse = await page.context().request.patch(
    `/api/cases/send-history/${acceptableTarget.targetId}/status`,
    {
      data: { nextStatus: "TRANSPORT_DECIDED" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(decisionResponse.ok()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalB, "/hospitals/patients");
  await expect(page.getByTestId("hospital-patients-table")).toBeVisible();
  await expect(page.getByText(testCases.teamAVisible)).toBeVisible();
});
test("HOSPITAL operational notifications are deduped and can be acknowledged", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  const settingsResponse = await page.context().request.patch("/api/settings/hospital/notifications", {
    data: {
      notifyNewRequest: true,
      notifyReplyArrival: true,
      notifyTransportDecided: true,
      notifyTransportDeclined: true,
      notifyRepeat: true,
      notifyReplyDelay: true,
      replyDelayMinutes: 10,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(settingsResponse.ok()).toBeTruthy();

  const firstResponse = await page.context().request.get("/api/notifications?limit=100");
  expect(firstResponse.ok()).toBeTruthy();
  const firstData = await firstResponse.json();
  const firstItems = firstData.items ?? [];

  const repeatItems = firstItems.filter(
    (item: { kind?: string; caseId?: string | null; severity?: string; dedupeKey?: string | null }) =>
      item.kind === "request_repeat" && item.caseId === testCases.teamBHidden && item.severity === "warning" && !!item.dedupeKey,
  );
  const delayItems = firstItems.filter(
    (item: { kind?: string; caseId?: string | null; severity?: string; dedupeKey?: string | null }) =>
      item.kind === "reply_delay" && item.caseId === testCases.teamBHidden && item.severity === "critical" && !!item.dedupeKey,
  );

  expect(repeatItems).toHaveLength(1);
  expect(delayItems).toHaveLength(1);

  const secondResponse = await page.context().request.get("/api/notifications?limit=100");
  expect(secondResponse.ok()).toBeTruthy();
  const secondData = await secondResponse.json();
  const secondItems = secondData.items ?? [];

  expect(
    secondItems.filter((item: { kind?: string; caseId?: string | null }) => item.kind === "request_repeat" && item.caseId === testCases.teamBHidden),
  ).toHaveLength(1);
  expect(
    secondItems.filter((item: { kind?: string; caseId?: string | null }) => item.kind === "reply_delay" && item.caseId === testCases.teamBHidden),
  ).toHaveLength(1);

  const acknowledgeResponse = await page.context().request.patch("/api/notifications", {
    data: { ids: [delayItems[0].id], ack: true },
    headers: { "Content-Type": "application/json" },
  });
  expect(acknowledgeResponse.ok()).toBeTruthy();

  const thirdResponse = await page.context().request.get("/api/notifications?limit=100");
  expect(thirdResponse.ok()).toBeTruthy();
  const thirdData = await thirdResponse.json();
  const acknowledgedItem = (thirdData.items ?? []).find(
    (item: { id?: number; kind?: string; ackedAt?: string | null; isRead?: boolean }) =>
      item.id === delayItems[0].id && item.kind === "reply_delay",
  );

  expect(acknowledgedItem).toBeTruthy();
  expect(acknowledgedItem.ackedAt).toBeTruthy();
  expect(acknowledgedItem.isRead).toBeTruthy();
});
