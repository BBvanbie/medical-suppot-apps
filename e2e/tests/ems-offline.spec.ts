import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { clearOfflineDb, forceOfflineMode, forceOnlineMode, listOfflineQueueItems, seedOfflineQueueItems, type OfflineQueueItem } from "../support/offline";
import { testCases, testUsers } from "../support/test-data";

const OFFLINE_BANNER = "\u30aa\u30d5\u30e9\u30a4\u30f3\u4e2d\u3067\u3059\u3002\u4e00\u90e8\u64cd\u4f5c\u306f\u672a\u9001\u4fe1\u30ad\u30e5\u30fc\u306b\u4fdd\u5b58\u3055\u308c\u307e\u3059\u3002";
const PENDING_COUNT = "\u672a\u9001\u4fe1\u4ef6\u6570: 1\u4ef6";
const HOSPITAL_REQUEST_LABEL = "\u53d7\u5165\u8981\u8acb\u9001\u4fe1";
const CONSULT_REPLY_LABEL = "\u76f8\u8ac7\u8fd4\u4fe1";
const SEND_BUTTON = "\u9001\u4fe1";
const RETRY_BUTTON = "\u518d\u8a66\u884c";
const SEND_SUCCESS_MESSAGE = "\u672a\u9001\u4fe1\u9805\u76ee\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f\u3002";
const NOT_FOUND_MESSAGE = "\u5bfe\u8c61\u4e8b\u6848\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002";
const FAILED_STATUS = "\u9001\u4fe1\u5931\u6557";

function createHospitalRequestItem(id: string, caseId: string): OfflineQueueItem {
  return {
    id,
    type: "hospital_request_send",
    serverCaseId: caseId,
    payload: {
      requestId: `${id}-REQ`,
      caseId,
      createdAt: new Date().toISOString(),
      hospitals: [{ hospitalId: 990001, hospitalName: "E2E Central Hospital", address: "E2E 1-1-1", phone: "03-1111-1111", departments: ["internal"], distanceKm: 1.2 }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "ready_to_send",
    errorMessage: null,
  };
}

test("EMS shows the offline banner and queue page for queued items", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");
  await clearOfflineDb(page);

  const queuedItem: OfflineQueueItem = { ...createHospitalRequestItem("e2e-hospital-request-1", testCases.teamAVisible), status: "pending" };

  await seedOfflineQueueItems(page, [queuedItem]);
  await page.reload();
  await forceOfflineMode(page);

  await expect(page.getByText(OFFLINE_BANNER)).toBeVisible();
  await expect(page.getByText(PENDING_COUNT)).toBeVisible();

  await forceOnlineMode(page);
  await page.goto("/settings/offline-queue");
  await expect(page.getByTestId("offline-queue-table")).toBeVisible();
  await expect(page.getByTestId("offline-queue-row").filter({ hasText: HOSPITAL_REQUEST_LABEL })).toContainText(testCases.teamAVisible);
});

test("EMS shows queued consult replies in the offline queue page", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");
  await clearOfflineDb(page);

  const queuedItem: OfflineQueueItem = {
    id: "e2e-consult-reply-1",
    type: "consult_reply",
    serverCaseId: testCases.teamAVisible,
    targetId: "910001",
    payload: {
      targetId: 910001,
      note: "E2E offline consult reply",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "ready_to_send",
    errorMessage: null,
  };

  await seedOfflineQueueItems(page, [queuedItem]);
  const queuedItems = await listOfflineQueueItems(page);
  expect(queuedItems.some((item) => item.type === "consult_reply" && item.serverCaseId === testCases.teamAVisible)).toBeTruthy();

  await page.goto("/settings/offline-queue");
  await expect(page.getByTestId("offline-queue-table")).toBeVisible();
  await expect(page.getByTestId("offline-queue-row").filter({ hasText: CONSULT_REPLY_LABEL })).toContainText(testCases.teamAVisible);
});

test("EMS disables transport actions while offline on case search", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");
  await clearOfflineDb(page);

  await forceOfflineMode(page);
  await expect(page.getByText(OFFLINE_BANNER)).toBeVisible();

  const caseRow = page.locator(`[data-testid="ems-case-row"][data-case-id="${testCases.teamAVisible}"]`);
  await caseRow.click();

  const targetRows = page.locator(`[data-testid="ems-case-target-row"][data-case-id="${testCases.teamAVisible}"]`);
  await expect(targetRows).toHaveCount(2);

  const firstTargetRow = targetRows.first();
  await expect(firstTargetRow.locator("button").nth(0)).toBeDisabled();
  await expect(firstTargetRow.locator("button").nth(1)).toBeDisabled();
});

test("EMS can discard queued items from the offline queue page", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/settings/offline-queue");
  await clearOfflineDb(page);

  const queuedItem = createHospitalRequestItem("e2e-queue-discard-1", testCases.teamAVisible);

  await seedOfflineQueueItems(page, [queuedItem]);
  await page.reload();

  const row = page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-queue-discard-1"]');
  await expect(row).toBeVisible();
  await row.locator("button").nth(2).click();
  await expect(page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-queue-discard-1"]')).toHaveCount(0);
});

test("EMS can manually resend a queued hospital request from the offline queue page", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/settings/offline-queue");
  await clearOfflineDb(page);

  const queuedItem = createHospitalRequestItem("e2e-hospital-request-send-success", testCases.teamAVisible);

  await seedOfflineQueueItems(page, [queuedItem]);
  await page.reload();

  const row = page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-hospital-request-send-success"]');
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: SEND_BUTTON }).click();

  await expect(page.getByText(SEND_SUCCESS_MESSAGE)).toBeVisible();
  await expect(page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-hospital-request-send-success"]')).toHaveCount(0);
});

test("EMS keeps failed resend items in the offline queue page", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/settings/offline-queue");
  await clearOfflineDb(page);

  const queuedItem = createHospitalRequestItem("e2e-hospital-request-send-failed", "E2E-NOT-FOUND");

  await seedOfflineQueueItems(page, [queuedItem]);
  await page.reload();

  const row = page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-hospital-request-send-failed"]');
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: SEND_BUTTON }).click();

  await expect(row).toContainText(NOT_FOUND_MESSAGE);
  await expect(row).toContainText(FAILED_STATUS);
  await expect(row.getByRole("button", { name: RETRY_BUTTON })).toBeVisible();
});
