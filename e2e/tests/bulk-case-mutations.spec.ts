import { execFileSync } from "node:child_process";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import globalSetup from "../global-setup";
import { loginAs } from "../support/auth";
import { testHospitals, testTeams, testUsers } from "../support/test-data";

const repoRoot = path.resolve(__dirname, "../..");
const hospitalNotAcceptableReason = "NO_BEDS";
const emsDeclineReason = "PATIENT_CIRCUMSTANCES";

type HospitalRequestRow = {
  targetId: number;
  caseId: string;
  status: string;
  fromTeamCode: string | null;
};

type SendHistoryRow = {
  targetId: number;
  caseId: string;
  rawStatus: string;
  hospitalName: string;
};

type DispatchCaseRow = {
  caseId: string;
};

type MutationState = {
  negotiateCaseId: string;
  negotiateTargetId: number;
  acceptableCaseId: string;
  acceptableTargetId: number;
  notAcceptableCaseId: string;
  notAcceptableTargetId: number;
};

const mutationState: MutationState = {
  negotiateCaseId: "",
  negotiateTargetId: 0,
  acceptableCaseId: "",
  acceptableTargetId: 0,
  notAcceptableCaseId: "",
  notAcceptableTargetId: 0,
};

function runSeedCommand(args: string[]) {
  try {
    execFileSync(process.execPath, ["scripts/manage_case_load_test_data.js", ...args], {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    const output =
      error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr
        : String(error);
    throw new Error(`bulk seed command failed: node scripts/manage_case_load_test_data.js ${args.join(" ")}\n${output}`);
  }
}

async function fetchJson<T>(page: Page, url: string): Promise<T> {
  const response = await page.context().request.get(url);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function fetchHospitalRows(page: Page): Promise<HospitalRequestRow[]> {
  const data = await fetchJson<{ rows?: HospitalRequestRow[] }>(page, "/api/hospitals/requests");
  return data.rows ?? [];
}

async function fetchSendHistory(page: Page, caseRef: string): Promise<SendHistoryRow[]> {
  const data = await fetchJson<{ rows?: SendHistoryRow[] }>(
    page,
    `/api/cases/send-history?caseRef=${encodeURIComponent(caseRef)}`,
  );
  return data.rows ?? [];
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  runSeedCommand(["reset"]);
  runSeedCommand(["seed", "--count", "100"]);
  runSeedCommand(["verify", "--expected", "100"]);
});

test.afterAll(async () => {
  await globalSetup();
});

test("HOSPITAL can run bulk mutations across read, negotiating, acceptable, and not acceptable targets", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();

  const hospitalRows = await fetchHospitalRows(page);
  const teamARows = hospitalRows.filter((row) => row.fromTeamCode === testTeams.teamA.code);
  const readRow = teamARows.find((row) => row.status === "READ");
  const emsAcceptableRow = teamARows.find((row) => row.status === "ACCEPTABLE");
  const negotiatingRows = hospitalRows.filter((row) => row.status === "NEGOTIATING");
  const acceptableSourceRow = negotiatingRows[0];
  const notAcceptableSourceRow = negotiatingRows[1];

  expect(readRow).toBeTruthy();
  expect(emsAcceptableRow).toBeTruthy();
  expect(acceptableSourceRow).toBeTruthy();
  expect(notAcceptableSourceRow).toBeTruthy();

  mutationState.negotiateCaseId = readRow!.caseId;
  mutationState.negotiateTargetId = readRow!.targetId;
  mutationState.acceptableCaseId = emsAcceptableRow!.caseId;
  mutationState.acceptableTargetId = emsAcceptableRow!.targetId;
  mutationState.notAcceptableCaseId = notAcceptableSourceRow!.caseId;
  mutationState.notAcceptableTargetId = notAcceptableSourceRow!.targetId;

  const negotiationNote = "bulk mutation: READ から要相談へ切り替え";
  const readRowLocator = page.locator(`[data-testid="hospital-request-row"][data-target-id="${readRow!.targetId}"]`);
  await readRowLocator.getByTestId("hospital-request-detail-button").click();
  await expect(page.getByTestId("hospital-request-detail-modal")).toBeVisible();
  await page.getByTestId("hospital-request-detail-modal").getByTestId("hospital-status-action-negotiating").click();
  await expect(page.getByText("相談チャット")).toBeVisible();
  await page.getByPlaceholder("A側へ送る相談内容を入力してください").fill(negotiationNote);
  await page.getByTestId("hospital-consult-send").click();
  await expect(page.getByText(negotiationNote)).toBeVisible();
  await expect
    .poll(async () => (await fetchHospitalRows(page)).find((row) => row.targetId === readRow!.targetId)?.status)
    .toBe("NEGOTIATING");
  await page.goto("/hospitals/requests");
  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();

  let refreshedRows = await fetchHospitalRows(page);
  expect(refreshedRows.find((row) => row.targetId === readRow!.targetId)?.status).toBe("NEGOTIATING");

  const acceptableRowLocator = page.locator(
    `[data-testid="hospital-request-row"][data-target-id="${acceptableSourceRow!.targetId}"]`,
  );
  await acceptableRowLocator.getByTestId("hospital-request-consult-button").click();
  await expect(page.getByText("相談チャット")).toBeVisible();
  await page.getByRole("button", { name: "受入可能を送信" }).click();
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText("受入可能を送信しました。")).toBeVisible();
  await expect
    .poll(async () => (await fetchHospitalRows(page)).find((row) => row.targetId === acceptableSourceRow!.targetId)?.status)
    .toBe("ACCEPTABLE");
  await page.goto("/hospitals/requests");
  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();

  refreshedRows = await fetchHospitalRows(page);
  expect(refreshedRows.find((row) => row.targetId === acceptableSourceRow!.targetId)?.status).toBe("ACCEPTABLE");

  const notAcceptableRowLocator = page.locator(
    `[data-testid="hospital-request-row"][data-target-id="${notAcceptableSourceRow!.targetId}"]`,
  );
  await notAcceptableRowLocator.getByTestId("hospital-request-consult-button").click();
  await expect(page.getByText("相談チャット")).toBeVisible();
  await page.getByRole("button", { name: "受入不可を送信" }).click();
  const hospitalReasonDialog = page.locator("div").filter({ hasText: "受入不可理由を選択" }).last();
  await hospitalReasonDialog.getByRole("combobox").selectOption(hospitalNotAcceptableReason);
  await hospitalReasonDialog.getByRole("button", { name: "受入不可を送信" }).click();
  await expect(page.getByText("受入不可を送信しました。")).toBeVisible();
  await expect
    .poll(async () => (await fetchHospitalRows(page)).find((row) => row.targetId === notAcceptableSourceRow!.targetId)?.status)
    .toBe("NOT_ACCEPTABLE");
  await page.goto("/hospitals/requests");
  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();

  refreshedRows = await fetchHospitalRows(page);
  expect(refreshedRows.find((row) => row.targetId === notAcceptableSourceRow!.targetId)?.status).toBe("NOT_ACCEPTABLE");
});

test("EMS mutations update bulk cases and ADMIN sees the resulting history", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");
  await expect(page.getByTestId("ems-cases-table")).toBeVisible();

  const acceptableHistoryBefore = await fetchSendHistory(page, mutationState.acceptableCaseId);
  expect(acceptableHistoryBefore.find((row) => row.targetId === mutationState.acceptableTargetId)?.rawStatus).toBe("ACCEPTABLE");

  await page.locator(`[data-testid="ems-case-row"][data-case-id="${mutationState.acceptableCaseId}"]`).click();
  await expect(page.getByText("送信先履歴を読み込み中...")).not.toBeVisible({ timeout: 15000 });
  const acceptableTargetCard = page
    .locator(`[data-testid="ems-case-target-row"][data-case-id="${mutationState.acceptableCaseId}"]`)
    .filter({ hasText: testHospitals.hospitalA })
    .first();
  await acceptableTargetCard.getByRole("button", { name: "搬送決定" }).click();
  await expect(page.getByText("搬送決定を送信しますか？")).toBeVisible();
  await page.getByRole("button", { name: "送信" }).click();
  await expect
    .poll(async () => (await fetchSendHistory(page, mutationState.acceptableCaseId)).find((row) => row.targetId === mutationState.acceptableTargetId)?.rawStatus)
    .toBe("TRANSPORT_DECIDED");

  await page.goto("/cases/search");
  await expect(page.getByTestId("ems-cases-table")).toBeVisible();

  const negotiatingHistoryBefore = await fetchSendHistory(page, mutationState.negotiateCaseId);
  expect(negotiatingHistoryBefore.find((row) => row.targetId === mutationState.negotiateTargetId)?.rawStatus).toBe("NEGOTIATING");

  await page.locator(`[data-testid="ems-case-row"][data-case-id="${mutationState.negotiateCaseId}"]`).click();
  await expect(page.getByText("送信先履歴を読み込み中...")).not.toBeVisible({ timeout: 15000 });
  const declineTargetCard = page
    .locator(`[data-testid="ems-case-target-row"][data-case-id="${mutationState.negotiateCaseId}"]`)
    .filter({ hasText: testHospitals.hospitalA })
    .first();
  await declineTargetCard.getByRole("button", { name: "搬送辞退" }).click();
  const emsReasonDialog = page.locator("div").filter({ hasText: "搬送辞退理由を選択" }).last();
  await emsReasonDialog.getByRole("combobox").selectOption(emsDeclineReason);
  await emsReasonDialog.getByRole("button", { name: "搬送辞退を送信" }).click();
  await expect
    .poll(async () => (await fetchSendHistory(page, mutationState.negotiateCaseId)).find((row) => row.targetId === mutationState.negotiateTargetId)?.rawStatus)
    .toBe("TRANSPORT_DECLINED");

  await page.context().clearCookies();
  await loginAs(page, testUsers.admin, "/admin/cases");
  await expect(page.getByTestId("admin-cases-table")).toBeVisible();

  const decidedRow = page.locator(`[data-testid="admin-case-row"][data-case-id="${mutationState.acceptableCaseId}"]`);
  await expect(decidedRow).toContainText("搬送決定");
  await decidedRow.getByRole("button", { name: "履歴を見る" }).click();
  const decidedHistoryPanel = page.locator(
    `[data-testid="admin-case-history-panel"][data-case-id="${mutationState.acceptableCaseId}"]`,
  );
  await expect(decidedHistoryPanel).toContainText(testHospitals.hospitalA);
  await expect(decidedHistoryPanel).toContainText("搬送決定");

  const declinedRow = page.locator(`[data-testid="admin-case-row"][data-case-id="${mutationState.negotiateCaseId}"]`);
  await expect(declinedRow).toBeVisible();
  await declinedRow.getByRole("button", { name: "履歴を見る" }).click();
  const declinedHistoryPanel = page.locator(
    `[data-testid="admin-case-history-panel"][data-case-id="${mutationState.negotiateCaseId}"]`,
  );
  await expect(declinedHistoryPanel).toContainText(testHospitals.hospitalA);
  await expect(declinedHistoryPanel).toContainText("搬送辞退");
});

test("DISPATCH bulk cases remain visible and at least one dispatch-origin case is reflected into EMS scope", async ({ page }) => {
  await loginAs(page, testUsers.dispatch, "/dispatch/cases");
  await expect(page.getByRole("heading", { name: "指令一覧" })).toBeVisible();

  const dispatchCases = await fetchJson<{ rows?: DispatchCaseRow[] }>(page, "/api/dispatch/cases");
  const dispatchCaseIds = (dispatchCases.rows ?? []).map((row) => row.caseId);
  expect(dispatchCaseIds.length).toBeGreaterThan(0);
  await expect(page.getByRole("cell", { name: dispatchCaseIds[0] })).toBeVisible();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");
  await expect(page.getByTestId("ems-cases-table")).toBeVisible();

  const emsCases = await fetchJson<{ rows?: Array<{ caseId?: string }> }>(page, "/api/cases/search?limit=200");
  const emsCaseIds = new Set((emsCases.rows ?? []).map((row) => row.caseId).filter((value): value is string => Boolean(value)));
  const reflectedCaseId = dispatchCaseIds.find((caseId) => emsCaseIds.has(caseId));

  expect(reflectedCaseId).toBeTruthy();
  await expect(page.locator(`[data-testid="ems-case-row"][data-case-id="${reflectedCaseId}"]`)).toBeVisible();
});
