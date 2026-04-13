import { execFileSync } from "node:child_process";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

import { loginAs } from "../support/auth";

const repoRoot = path.resolve(__dirname, "../..");
loadEnvConfig(repoRoot);

const loadUsers = {
  admin: { username: "admin01", password: "ChangeMe123!" },
  dispatch: { username: "dispatch01", password: "ChangeMe123!" },
  ems: { username: "ems_008", password: "ChangeMe123!" },
  hospital: { username: "hospital_12", password: "ChangeMe123!" },
} as const;

const loadCases = {
  adminLatest: "LOAD-CASE-20260401-011",
  emsLatest: "LOAD-CASE-20260401-840",
  hospitalLatest: "LOAD-CASE-20260401-012",
  dispatchOrigin: "LOAD-CASE-20260401-091",
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
    throw new Error(`load seed command failed: node scripts/manage_case_load_test_data.js ${args.join(" ")}\n${output}`);
  }
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

async function resetMfaForUsers(usernames: string[]) {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  try {
    await pool.query(
      `
        DELETE FROM user_mfa_challenges
        WHERE user_id IN (SELECT id FROM users WHERE username = ANY($1::text[]))
      `,
      [usernames],
    );
    await pool.query(
      `
        DELETE FROM user_mfa_credentials
        WHERE user_id IN (SELECT id FROM users WHERE username = ANY($1::text[]))
      `,
      [usernames],
    );
  } finally {
    await pool.end();
  }
}

async function expectNoPageHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

async function getDomText(page: Page, selector: string) {
  return page.evaluate((targetSelector) => document.querySelector(targetSelector)?.textContent ?? "", selector);
}

async function getDomCount(page: Page, selector: string) {
  return page.evaluate((targetSelector) => document.querySelectorAll(targetSelector).length, selector);
}

async function clickDom(page: Page, selector: string) {
  const clicked = await page.evaluate((targetSelector) => {
    const element = document.querySelector<HTMLElement>(targetSelector);
    element?.click();
    return Boolean(element);
  }, selector);
  expect(clicked, selector).toBeTruthy();
}

test.describe.configure({ mode: "serial" });
test.setTimeout(8 * 60 * 1000);

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(3 * 60 * 1000);
  runSeedCommand(["reset"]);
  runSeedCommand(["seed", "--count", "10000", "--chunk-size", "100"]);
  runSeedCommand(["verify", "--expected", "10000"]);
  await resetMfaForUsers([loadUsers.hospital.username]);
});

test("ADMIN can browse the 10000-case load dataset without layout loss", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 920 });
  await loginAs(page, loadUsers.admin, "/admin/cases");

  await expect(page.getByRole("heading", { name: "事案一覧" })).toBeVisible();
  await expect(page.getByTestId("admin-cases-table")).toBeVisible();
  await expect(page.getByTestId("admin-case-row")).toHaveCount(300);

  const loadRow = page.locator(`[data-testid="admin-case-row"][data-case-id="${loadCases.adminLatest}"]`);
  await expect(loadRow).toBeVisible();

  await page.locator(`[data-testid="admin-case-detail-button"][data-case-id="${loadCases.adminLatest}"]`).click();
  await expect(page.locator(`[data-testid="admin-case-detail-button"][data-case-id="${loadCases.adminLatest}"]`)).toHaveText(
    "詳細表示中",
  );
  await expect(page.getByRole("button", { name: "患者サマリー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "選定履歴" })).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
});

test("EMS can browse its 10000-case team slice on tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await loginAs(page, loadUsers.ems, "/cases/search");

  await expect.poll(() => getDomText(page, "h1")).toContain("事案一覧");
  await expect.poll(() => getDomCount(page, "[data-testid='ems-case-row']")).toBe(40);
  await expect.poll(() => getDomCount(page, `[data-testid='ems-case-row'][data-case-id='${loadCases.emsLatest}']`)).toBe(1);

  await clickDom(page, `[data-testid='ems-case-row'][data-case-id='${loadCases.emsLatest}']`);
  await expect.poll(() => getDomCount(page, "[data-testid='ems-case-target-row']")).toBeGreaterThan(0);
  await expectNoPageHorizontalOverflow(page);
});

test("HOSPITAL can browse its 10000-case request slice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 920 });
  await loginAs(page, loadUsers.hospital, "/hospitals/requests");

  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();
  const requestRow = page.getByTestId("hospital-request-row").first();
  await expect(requestRow).toBeVisible();
  await expect(requestRow).toContainText("LOAD-CASE-20260401-");

  await requestRow.getByTestId("hospital-request-detail-button").click();
  await expect(page.getByTestId("hospital-request-detail-modal")).toBeVisible();
  await expect(page.getByTestId("hospital-request-detail-modal")).toContainText("LOAD-CASE-20260401-");
  await expectNoPageHorizontalOverflow(page);
});

test("DISPATCH can see dispatch-origin load cases in the 10000-case list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 920 });
  await loginAs(page, loadUsers.dispatch, "/dispatch/cases");

  await expect(page.locator("h1").filter({ hasText: "指令一覧" })).toBeVisible();
  await expect(page.getByText("DISPATCH WORKBENCH")).toBeVisible();
  const dispatchRow = page.locator("tr").filter({ hasText: loadCases.dispatchOrigin });
  await expect(dispatchRow).toBeVisible();
  await expect(dispatchRow).toContainText("千代田区霞が関1-1-7");
  await expectNoPageHorizontalOverflow(page);
});
