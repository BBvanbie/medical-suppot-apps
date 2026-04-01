import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testUsers } from "../support/test-data";

test.setTimeout(120_000);

test("EMS selection stalled notification is materialized for the own team", async ({ page }) => {
  await loginAs(page, testUsers.emsB, "/paramedics");

  const firstResponse = await page.context().request.get("/api/notifications?limit=100");
  expect(firstResponse.ok()).toBeTruthy();
  const firstData = await firstResponse.json();
  const firstItems = firstData.items ?? [];

  const stalledItems = firstItems.filter(
    (item: { kind?: string; caseId?: string | null; caseUid?: string | null; severity?: string; dedupeKey?: string | null }) =>
      item.kind === "selection_stalled"
      && item.caseId === testCases.teamBHidden
      && item.caseUid === testCases.teamBHiddenUid
      && item.severity === "warning"
      && !!item.dedupeKey,
  );
  expect(stalledItems).toHaveLength(1);

  const secondResponse = await page.context().request.get("/api/notifications?limit=100");
  expect(secondResponse.ok()).toBeTruthy();
  const secondData = await secondResponse.json();
  expect(
    (secondData.items ?? []).filter(
      (item: { kind?: string; caseId?: string | null }) =>
        item.kind === "selection_stalled" && item.caseId === testCases.teamBHidden,
    ),
  ).toHaveLength(1);
});

test("EMS consult stalled notification is materialized for the own team", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/paramedics");

  const response = await page.context().request.get("/api/notifications?limit=100");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  const stalledItem = (data.items ?? []).find(
    (item: { kind?: string; caseId?: string | null; caseUid?: string | null; severity?: string }) =>
      item.kind === "consult_stalled"
      && item.caseId === testCases.teamAConsultStalled
      && item.caseUid === testCases.teamAConsultStalledUid
      && (item.severity === "warning" || item.severity === "critical"),
  );
  expect(stalledItem).toBeTruthy();
});

test("HOSPITAL consult stalled notification and ADMIN dashboard alert are shown", async ({ page }) => {
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

  const notificationsResponse = await page.context().request.get("/api/notifications?limit=100");
  expect(notificationsResponse.ok()).toBeTruthy();
  const notificationsData = await notificationsResponse.json();
  const stalledItem = (notificationsData.items ?? []).find(
    (item: { kind?: string; caseId?: string | null; caseUid?: string | null; severity?: string }) =>
      item.kind === "consult_stalled"
      && item.caseId === testCases.teamAConsultStalled
      && item.caseUid === testCases.teamAConsultStalledUid
      && (item.severity === "warning" || item.severity === "critical"),
  );
  expect(stalledItem).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.admin, "/admin");
  await expect(page.getByText(/要相談案件の(長時間)?停滞が \d+ 件あります。\d+ 分以上更新がありません。/).first()).toBeVisible();
});
