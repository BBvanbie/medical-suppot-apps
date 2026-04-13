import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

async function setCurrentMode(page: Page, mode: "LIVE" | "TRAINING") {
  const response = await page.context().request.patch("/api/settings/user-mode", {
    data: { mode },
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.text();

  expect(response.ok(), `${response.status()}: ${body}`).toBeTruthy();
}

test("EMS training mode hides production analytics and marks case creation as training", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, testUsers.emsA, "/settings/mode");

  try {
    await setCurrentMode(page, "TRAINING");

    await page.goto("/paramedics/stats");
    await expect(page.getByText("訓練モードでは統計を表示しません")).toBeVisible();

    await page.goto("/cases/new");
    await expect(page.getByText("TRAINING", { exact: true })).toBeVisible();
    await expect(page.getByText("この事案は training として保存されます")).toBeVisible();

    await page.goto("/cases/search");
    await expect(page.getByText("訓練モードで表示中です。")).toBeVisible();
  } finally {
    await setCurrentMode(page, "LIVE");
  }
});

test("HOSPITAL and ADMIN training mode hide production analytics", async ({ page }) => {
  test.setTimeout(90_000);

  await loginAs(page, testUsers.hospitalA, "/hp/settings/mode");
  try {
    await setCurrentMode(page, "TRAINING");

    await page.goto("/hospitals/stats");
    await expect(page.getByText("訓練モードでは統計を表示しません")).toBeVisible();
    await expect(page.getByText("訓練モードで表示中です。")).toBeVisible();
  } finally {
    await setCurrentMode(page, "LIVE");
  }

  await page.context().clearCookies();
  await loginAs(page, testUsers.admin, "/admin/settings/mode");
  try {
    await setCurrentMode(page, "TRAINING");

    await page.goto("/admin/stats");
    await expect(page.getByText("訓練モードでは統計を表示しません")).toBeVisible();
    await expect(page.getByText("訓練モードで表示中です。")).toBeVisible();
  } finally {
    await setCurrentMode(page, "LIVE");
  }
});

test("ADMIN can reset training data and clear training dispatch cases", async ({ page }) => {
  test.setTimeout(60_000);
  const uniqueAddress = `E2E TRAINING RESET ${Date.now()}`;

  await loginAs(page, testUsers.dispatch, "/dispatch/new");
  try {
    await setCurrentMode(page, "TRAINING");
    await page.goto("/dispatch/new");

    const teamSelect = page.getByLabel("隊名");
    const teamValue = await teamSelect.locator("option").nth(1).getAttribute("value");
    expect(teamValue).toBeTruthy();

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const createResponse = await page.context().request.post("/api/dispatch/cases", {
      data: {
        teamId: Number(teamValue),
        dispatchDate: date,
        dispatchTime: time,
        dispatchAddress: uniqueAddress,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(createResponse.ok()).toBeTruthy();

    await page.goto("/dispatch/cases");
    await expect(page.getByText("訓練モードで表示中です。")).toBeVisible();
    await expect(page.getByText("TRAINING", { exact: true })).toBeVisible();
    await expect(page.getByText(uniqueAddress)).toBeVisible();

    await page.context().clearCookies();
    await loginAs(page, testUsers.admin, "/admin/settings/mode");
    try {
      await setCurrentMode(page, "TRAINING");
      await page.goto("/admin/settings/mode");

      await expect(page.getByTestId("training-reset-summary")).toBeVisible();
      await page.getByTestId("training-reset-open-confirm").click();
      await page.getByRole("button", { name: "一括リセットする" }).click();

      await expect(page.getByText("訓練データを一括リセットしました。")).toBeVisible();
      await expect(page.getByTestId("training-reset-cases")).toHaveText("0");
    } finally {
      await setCurrentMode(page, "LIVE");
    }

    await page.context().clearCookies();
    await loginAs(page, testUsers.dispatch, "/dispatch/cases");
    await expect(page.getByText(uniqueAddress)).toHaveCount(0);
  } finally {
    try {
      await setCurrentMode(page, "LIVE");
    } catch {
      // Best-effort cleanup for later tests; mode-specific assertions already completed.
    }
  }
});

test("DISPATCH can switch training mode from settings and read guidance", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, testUsers.dispatch, "/dispatch/settings/mode");

  try {
    await setCurrentMode(page, "TRAINING");

    await page.goto("/dispatch/settings/mode");
    await expect(page.getByText("訓練 / デモモードの使い方")).toBeVisible();
    await expect(page.getByText("指令向けの使い方")).toBeVisible();
    await expect(page.getByText("開始前に mode を TRAINING に保存し")).toBeVisible();

    await page.goto("/dispatch/new");
    await expect(page.getByText("この画面から作る事案は training 案件として保存されます。")).toBeVisible();
  } finally {
    await setCurrentMode(page, "LIVE");
  }
});
