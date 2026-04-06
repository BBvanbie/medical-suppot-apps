import { execFileSync } from "node:child_process";
import path from "node:path";

import { expect, test } from "@playwright/test";

import globalSetup from "../global-setup";
import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

const repoRoot = path.resolve(__dirname, "../..");
const loadCases = {
  admin: "LOAD-CASE-20260401-025",
  emsVisible: "LOAD-CASE-20260401-025",
  emsHidden: "LOAD-CASE-20260401-026",
  hospitalConsult: "LOAD-CASE-20260401-037",
  dispatch: "LOAD-CASE-20260401-091",
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

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  runSeedCommand(["reset"]);
  runSeedCommand(["seed", "--count", "100"]);
  runSeedCommand(["verify", "--expected", "100"]);
});

test.afterAll(async () => {
  await globalSetup();
});

test("ADMIN can inspect seeded bulk cases", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin/cases");

  await expect(page.getByRole("heading", { name: "事案一覧" })).toBeVisible();
  await expect(page.getByTestId("admin-cases-table")).toBeVisible();

  const loadRow = page.locator(`[data-testid="admin-case-row"][data-case-id="${loadCases.admin}"]`);
  await expect(loadRow).toBeVisible();
  await expect(page.getByTestId("admin-case-row")).toHaveCount(100);

  await page
    .locator(`[data-testid="admin-case-detail-button"][data-case-id="${loadCases.admin}"]`)
    .click();
  await expect(
    page.locator(`[data-testid="admin-case-detail-button"][data-case-id="${loadCases.admin}"]`),
  ).toHaveText("詳細表示中");
  await expect(page.getByRole("button", { name: "患者サマリー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "選定履歴" })).toBeVisible();
});

test("EMS sees only own-team bulk cases and can expand send history", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");

  await expect(page.getByTestId("ems-cases-table")).toBeVisible();
  await expect(page.locator(`[data-testid="ems-case-row"][data-case-id="${loadCases.emsVisible}"]`)).toBeVisible();
  await expect(page.locator(`[data-testid="ems-case-row"][data-case-id="${loadCases.emsHidden}"]`)).toHaveCount(0);

  await page.locator(`[data-testid="ems-case-row"][data-case-id="${loadCases.emsVisible}"]`).click();
  await expect(page.getByText("送信先履歴を読み込み中...")).not.toBeVisible({ timeout: 15000 });
  await expect(page.getByText("E2E 中央病院")).toBeVisible();
  await expect(page.getByText("E2E 西病院")).toBeVisible();
});

test("HOSPITAL can open consult flow for seeded negotiating requests", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  await expect(page.getByRole("heading", { name: "受入要請一覧" })).toBeVisible();
  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();

  const requestRow = page.getByTestId("hospital-request-row").filter({ hasText: loadCases.hospitalConsult }).first();
  await expect(requestRow).toBeVisible();
  await requestRow.getByRole("button", { name: "相談" }).click();

  await expect(page.getByText("相談チャット")).toBeVisible();
  await expect(page.getByText(`${loadCases.hospitalConsult} / LOAD-REQ-20260401-037`)).toBeVisible();
  await expect(page.getByTestId("hospital-request-consult-send")).toBeVisible();
});

test("DISPATCH list includes seeded dispatch-origin cases", async ({ page }) => {
  await loginAs(page, testUsers.dispatch, "/dispatch/cases");

  await expect(page.getByRole("heading", { name: "指令一覧" })).toBeVisible();
  await expect(page.getByRole("cell", { name: loadCases.dispatch })).toBeVisible();
  await expect(page.getByRole("cell", { name: "千代田区霞が関1-1-7" })).toBeVisible();
});
