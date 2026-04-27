import { expect, test, type Browser, type Page } from "@playwright/test";

import globalSetup from "../global-setup";
import { loginAs } from "../support/auth";
import { clearOfflineDb, forceOfflineMode, forceOnlineMode, getOfflineCaseDraft, listOfflineQueueItems, seedOfflineCaseDrafts, seedOfflineQueueItems, type OfflineCaseDraft, type OfflineQueueItem } from "../support/offline";
import { testCases, testTeams, testUsers } from "../support/test-data";

test.setTimeout(120_000);

test.beforeEach(async () => {
  await globalSetup();
});

const OFFLINE_BANNER = "\u30aa\u30d5\u30e9\u30a4\u30f3\u4e2d\u3067\u3059\u3002\u4e00\u90e8\u64cd\u4f5c\u306f\u672a\u9001\u4fe1\u30ad\u30e5\u30fc\u306b\u4fdd\u5b58\u3055\u308c\u307e\u3059\u3002";
const PENDING_COUNT = "\u672a\u9001\u4fe1: 1\u4ef6";
const HOSPITAL_REQUEST_LABEL = "\u53d7\u5165\u8981\u8acb\u9001\u4fe1";
const CONSULT_REPLY_LABEL = "\u76f8\u8ac7\u8fd4\u4fe1";
const SEND_BUTTON = "\u9001\u4fe1";
const RETRY_BUTTON = "\u518d\u8a66\u884c";
const RETRY_ALL_BUTTON = "\u4e00\u62ec\u518d\u9001";
const SEND_SUCCESS_MESSAGE = "\u672a\u9001\u4fe1\u9805\u76ee\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f\u3002";
const NOT_FOUND_MESSAGE = "\u5bfe\u8c61\u4e8b\u6848\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002";
const FAILED_STATUS = "\u9001\u4fe1\u5931\u6557";
const FAILURE_KIND_LABEL = "\u5185\u5bb9\u78ba\u8a8d";
const RECOVERY_ACTION_LABEL = "\u4e0d\u8981\u306a\u3089\u7834\u68c4";

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

async function issueEmsRegistrationCode(browser: Browser) {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAs(adminPage, testUsers.admin, "/admin/devices");

  const emsDeviceRow = adminPage.locator("button").filter({ hasText: "EMS-IPAD-001" }).first();
  await emsDeviceRow.click();
  await adminPage.getByLabel("端末ロール").selectOption("EMS");
  await adminPage.getByLabel("救急隊所属").selectOption({
    label: `${testTeams.teamA.name} (${testTeams.teamA.code})`,
  });
  const saveButton = adminPage.getByRole("button", { name: "変更を保存" });
  if (await saveButton.isEnabled()) {
    await saveButton.click();
    await adminPage.getByRole("button", { name: "保存する" }).click();
    await expect(adminPage.getByText("端末情報を更新しました。")).toBeVisible();
  }

  await adminPage.getByTestId("admin-device-issue-registration-code").click();
  const registrationCode = (await adminPage.getByTestId("admin-device-issued-registration-code-value").textContent())?.trim();
  await adminContext.close();
  expect(registrationCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  return String(registrationCode);
}

async function loginAsRegisteredEms(page: Page, browser: Browser, callbackUrl: string) {
  const registrationCode = await issueEmsRegistrationCode(browser);
  await loginAs(page, testUsers.emsA, callbackUrl);
  if (page.url().includes("/register-device")) {
    await page.getByTestId("device-registration-code").fill(registrationCode);
    await page.getByTestId("device-registration-submit").click();
    await page.waitForURL((url) => url.pathname === "/paramedics" || url.pathname === "/login", { timeout: 15_000 });
    if (new URL(page.url()).pathname === "/login") {
      await loginAs(page, testUsers.emsA, callbackUrl);
    }
  }
  await page.goto(callbackUrl);
}

test("EMS shows the offline banner and queue page for queued items", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/cases/search");
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

test("EMS shows queued consult replies in the offline queue page", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/cases/search");
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

test("EMS disables transport actions while offline on case search", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/cases/search");
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

test("EMS can discard queued items from the offline queue page", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/settings/offline-queue");
  await clearOfflineDb(page);

  const queuedItem = createHospitalRequestItem("e2e-queue-discard-1", testCases.teamAVisible);

  await seedOfflineQueueItems(page, [queuedItem]);
  await page.reload();

  const row = page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-queue-discard-1"]');
  await expect(row).toBeVisible();
  await row.locator("button").nth(2).click();
  await expect(page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-queue-discard-1"]')).toHaveCount(0);
});

test("EMS can manually resend a queued hospital request from the offline queue page", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/settings/offline-queue");
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

test("EMS classifies resend failures on the offline queue page", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/settings/offline-queue");
  await clearOfflineDb(page);

  const queuedItem = createHospitalRequestItem("e2e-hospital-request-send-failed", "E2E-NOT-FOUND");

  await seedOfflineQueueItems(page, [queuedItem]);
  await page.reload();

  const row = page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-hospital-request-send-failed"]');
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: SEND_BUTTON }).click();

  await expect(row).toContainText(FAILED_STATUS);
  await expect(row).toContainText(FAILURE_KIND_LABEL);
  await expect(row).toContainText(RECOVERY_ACTION_LABEL);
  await row.getByRole("button", { name: "詳細" }).click();
  await expect(page.getByText(NOT_FOUND_MESSAGE)).toBeVisible();
  await expect(row.getByRole("button", { name: RETRY_BUTTON })).toBeVisible();
});

test("EMS can retry all retryable queue items", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/settings/offline-queue");
  await clearOfflineDb(page);

  const conflictItem = {
    id: "e2e-retry-all-conflict",
    type: "case_update",
    serverCaseId: testCases.teamAVisible,
    payload: { caseId: testCases.teamAVisible },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "conflict",
    errorMessage: "競合を検知しました。",
    failureKind: "conflict",
    recoveryAction: "review",
    lastAttemptAt: new Date().toISOString(),
  } as OfflineQueueItem;

  await seedOfflineQueueItems(page, [createHospitalRequestItem("e2e-retry-all-1", testCases.teamAVisible), conflictItem]);
  await page.reload();

  await page.getByRole("button", { name: RETRY_ALL_BUTTON }).click();

  await expect(page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-retry-all-1"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-retry-all-conflict"]')).toHaveCount(1);
});

test("EMS can discard a conflict item with server priority from the offline queue page", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/settings/offline-queue");
  await clearOfflineDb(page);

  const conflictDraft: OfflineCaseDraft = {
    localCaseId: testCases.teamAVisible,
    serverCaseId: testCases.teamAVisible,
    payload: {
      basic: { caseId: testCases.teamAVisible },
      summary: {},
      findingsV2: {},
    },
    syncStatus: "conflict",
    updatedAt: new Date().toISOString(),
    lastKnownServerUpdatedAt: new Date().toISOString(),
  };

  const conflictItem = {
    id: "e2e-conflict-discard-1",
    type: "case_update",
    localCaseId: testCases.teamAVisible,
    serverCaseId: testCases.teamAVisible,
    payload: { caseId: testCases.teamAVisible },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "conflict",
    errorMessage: "競合を検知しました。",
    failureKind: "conflict",
    recoveryAction: "review",
    lastAttemptAt: new Date().toISOString(),
    baseServerUpdatedAt: new Date().toISOString(),
  } as OfflineQueueItem;

  await seedOfflineCaseDrafts(page, [conflictDraft]);
  await seedOfflineQueueItems(page, [conflictItem]);
  await page.reload();

  const row = page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-conflict-discard-1"]');
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "詳細" }).click();
  await expect(page.getByText("サーバー更新とローカル下書きが競合しています")).toBeVisible();
  await page.getByRole("button", { name: "server優先で破棄" }).click();

  await expect(page.getByText("ローカル競合下書きを破棄し、server 優先で整理しました。")).toBeVisible();
  await expect(page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-conflict-discard-1"]')).toHaveCount(0);
  await expect.poll(async () => getOfflineCaseDraft(page, testCases.teamAVisible)).toBeNull();
});

test("EMS can inspect conflict classification and defer review from the offline queue page", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, "/settings/offline-queue");
  await clearOfflineDb(page);

  const now = new Date().toISOString();
  const conflictDraft: OfflineCaseDraft = {
    localCaseId: testCases.teamAVisible,
    serverCaseId: testCases.teamAVisible,
    payload: {
      basic: { caseId: testCases.teamAVisible, note: "local-basic" },
      summary: {
        chiefComplaint: "胸痛",
        dispatchSummary: "E2E dispatch summary A",
      },
    },
    serverSnapshot: {
      basic: {
        age: 45,
        name: "E2E 太郎",
        caseId: testCases.teamAVisible,
        gender: "male",
        address: "東京都港区E2E 3-3-3",
        teamCode: "E2E-TEAM-A",
        teamName: "E2E 本部機動第1",
        calculatedAge: 45,
      },
      vitals: [],
      summary: {
        chiefComplaint: "胸痛",
        dispatchSummary: "E2E dispatch summary A",
      },
    },
    syncStatus: "conflict",
    updatedAt: now,
    lastKnownServerUpdatedAt: now,
  };

  const conflictItem = {
    id: "e2e-conflict-summary-1",
    type: "case_update",
    localCaseId: testCases.teamAVisible,
    serverCaseId: testCases.teamAVisible,
    payload: conflictDraft.payload,
    createdAt: now,
    updatedAt: now,
    status: "conflict",
    errorMessage: "競合を検知しました。",
    failureKind: "conflict",
    recoveryAction: "review",
    lastAttemptAt: now,
    baseServerUpdatedAt: now,
    conflictType: "requires_review",
  } as OfflineQueueItem;

  await seedOfflineCaseDrafts(page, [conflictDraft]);
  await seedOfflineQueueItems(page, [conflictItem]);
  await page.reload();

  await page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-conflict-summary-1"]').click();
  const conflictSummary = page.getByTestId("offline-conflict-summary");
  const conflictDiff = page.getByTestId("offline-conflict-diff");
  await expect(conflictSummary).toBeVisible();
  await expect(conflictSummary.getByText("localのみ変更")).toBeVisible();
  await expect(conflictDiff).toBeVisible();
  await expect(conflictDiff).toContainText("note");
  await expect(conflictDiff).toContainText("local-basic");
  await page.getByRole("button", { name: "あとで確認する" }).click();
  await expect(page.getByText("競合案件は Offline Queue に残したまま、あとで確認できます。retry all では自動送信されません。")).toBeVisible();
  await expect(page.locator('[data-testid="offline-queue-row"][data-queue-id="e2e-conflict-summary-1"]')).toHaveCount(1);
});

test("EMS shows a conflict restore notice on case edit", async ({ browser, page }) => {
  await loginAsRegisteredEms(page, browser, `/cases/${testCases.teamAVisible}`);
  await clearOfflineDb(page);

  const conflictDraft: OfflineCaseDraft = {
    localCaseId: testCases.teamAVisible,
    serverCaseId: testCases.teamAVisible,
    payload: {
      basic: { caseId: testCases.teamAVisible },
      summary: {},
      findingsV2: {},
    },
    syncStatus: "conflict",
    updatedAt: new Date().toISOString(),
    lastKnownServerUpdatedAt: new Date().toISOString(),
  };

  await seedOfflineCaseDrafts(page, [conflictDraft]);
  await page.goto(`/cases/${testCases.teamAVisible}`);

  await expect(page.getByText("競合したローカル下書きを復元しました。")).toBeVisible();
  await expect(page.getByRole("link", { name: "競合内容を確認" })).toBeVisible();
});
