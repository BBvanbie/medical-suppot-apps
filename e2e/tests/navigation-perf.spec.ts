import { performance } from "node:perf_hooks";

import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testCases, testUsers } from "../support/test-data";

type PerfSample = {
  label: string;
  elapsedMs: number;
};

const EMS_NAVIGATION_WARN_MS = 4_500;
const HOSPITAL_NAVIGATION_WARN_MS = 3_500;
const ADMIN_NAVIGATION_WARN_MS = 4_000;

async function measure(label: string, action: () => Promise<void>): Promise<PerfSample> {
  const startedAt = performance.now();
  await action();
  const elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;
  console.info(`[nav-perf] ${JSON.stringify({ label, elapsedMs })}`);
  return { label, elapsedMs };
}

async function navigateByHref(page: Page, href: string, waitFor: () => Promise<void>, label: string) {
  return measure(label, async () => {
    await Promise.all([
      page.waitForURL((url) => url.pathname === href || url.pathname.startsWith(`${href}/`), { timeout: 30_000 }),
      page.locator(`a[href="${href}"]`).first().click(),
    ]);
    await waitFor();
  });
}

test("EMS navigation stays responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 920 });
  const samples: PerfSample[] = [];

  await loginAs(page, testUsers.emsA, "/paramedics");
  await expect(page).toHaveURL(/\/paramedics/);

  samples.push(
    await navigateByHref(
      page,
      "/cases/search",
      async () => {
        await expect(page.getByTestId("ems-cases-table")).toBeVisible();
      },
      "ems:paramedics->cases-search",
    ),
  );

  samples.push(
    await measure("ems:case-expand", async () => {
      const row = page.locator(`[data-testid="ems-case-row"][data-case-id="${testCases.teamAVisible}"]`);
      await row.click();
      await expect(page.locator(`[data-testid="ems-case-target-row"][data-case-id="${testCases.teamAVisible}"]`).first()).toBeVisible();
    }),
  );

  samples.push(
    await measure("ems:case-detail-open", async () => {
      await Promise.all([
        page.waitForURL((url) => url.pathname === `/cases/${testCases.teamAVisibleUid}` || url.pathname === `/cases/${testCases.teamAVisible}`, {
          timeout: 30_000,
        }),
        page.locator(`[data-testid="ems-case-row"][data-case-id="${testCases.teamAVisible}"] button`).filter({ hasText: "詳細" }).click(),
      ]);
      await expect(page.getByTestId("ems-case-detail-first-look")).toContainText(testCases.teamAVisible);
    }),
  );

  console.info(`[nav-perf-summary] ${JSON.stringify(samples)}`);
  expect(samples.filter((sample) => sample.elapsedMs > EMS_NAVIGATION_WARN_MS), `slow EMS samples: ${JSON.stringify(samples)}`).toHaveLength(0);
});

test("HOSPITAL navigation stays responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 920 });
  const samples: PerfSample[] = [];

  await loginAs(page, testUsers.hospitalA, "/hospitals");
  await expect(page).toHaveURL(/\/hospitals/);

  samples.push(
    await navigateByHref(
      page,
      "/hospitals/requests",
      async () => {
        await expect(page.getByTestId("hospital-requests-table")).toBeVisible();
      },
      "hospital:home->requests",
    ),
  );

  samples.push(
    await measure("hospital:request-detail-open", async () => {
      const row = page.getByTestId("hospital-request-row").first();
      await expect(row).toBeVisible();
      await row.getByTestId("hospital-request-detail-button").click();
      await expect(page.getByTestId("hospital-request-detail-modal")).toBeVisible();
    }),
  );

  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByTestId("hospital-request-detail-modal")).toBeHidden();

  samples.push(
    await navigateByHref(
      page,
      "/hospitals/consults",
      async () => {
        await expect(page.getByTestId("hospital-consults-table")).toBeVisible();
      },
      "hospital:requests->consults",
    ),
  );

  samples.push(
    await navigateByHref(
      page,
      "/hospitals/patients",
      async () => {
        await expect(page.getByTestId("hospital-patients-table")).toBeVisible();
      },
      "hospital:consults->patients",
    ),
  );

  console.info(`[nav-perf-summary] ${JSON.stringify(samples)}`);
  expect(samples.filter((sample) => sample.elapsedMs > HOSPITAL_NAVIGATION_WARN_MS), `slow HOSPITAL samples: ${JSON.stringify(samples)}`).toHaveLength(0);
});

test("ADMIN navigation stays responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 920 });
  const samples: PerfSample[] = [];

  await loginAs(page, testUsers.admin, "/admin");
  await expect(page).toHaveURL(/\/admin/);

  samples.push(
    await navigateByHref(
      page,
      "/admin/cases",
      async () => {
        await expect(page.getByTestId("admin-cases-table")).toBeVisible();
      },
      "admin:home->cases",
    ),
  );

  samples.push(
    await measure("admin:case-expand", async () => {
      const row = page.locator(`[data-testid="admin-case-row"][data-case-id="${testCases.teamAVisible}"]`);
      await row.getByRole("button", { name: "履歴を見る" }).click();
      await expect(page.locator(`[data-testid="admin-case-history-row"][data-case-id="${testCases.teamAVisible}"]`).first()).toBeVisible();
    }),
  );

  samples.push(
    await measure("admin:case-detail-open", async () => {
      await page.locator(`[data-testid="admin-case-detail-button"][data-case-id="${testCases.teamAVisible}"]`).click();
      await expect(page.getByRole("heading", { name: "送信前患者サマリー" })).toBeVisible();
    }),
  );

  console.info(`[nav-perf-summary] ${JSON.stringify(samples)}`);
  expect(samples.filter((sample) => sample.elapsedMs > ADMIN_NAVIGATION_WARN_MS), `slow ADMIN samples: ${JSON.stringify(samples)}`).toHaveLength(0);
});
