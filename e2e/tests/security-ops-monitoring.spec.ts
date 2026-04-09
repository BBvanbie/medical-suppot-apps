import { expect, test } from "@playwright/test";

import globalSetup from "../global-setup";
import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

test.setTimeout(120_000);

test.beforeEach(async () => {
  await globalSetup();
});

test("ADMIN monitoring page renders the six primary signals", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin/monitoring");

  await expect(page.getByRole("heading", { name: "監視", exact: true })).toBeVisible();
  await expect(page.getByText("ADMIN MONITORING")).toBeVisible();
  await expect(page.getByText("アプリ生存監視")).toBeVisible();
  await expect(page.getByText("DB 接続状態")).toBeVisible();
  await expect(page.getByText("ログイン失敗急増")).toBeVisible();
  await expect(page.getByText("重要 API 失敗")).toBeVisible();
  await expect(page.getByText("通知生成 / 配信失敗")).toBeVisible();
  await expect(page.getByRole("heading", { name: "バックアップ成否", exact: true })).toBeVisible();
});

test("notifications API returns 429 after the recommended read limit is exceeded", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");

  let lastStatus = 200;
  let lastBody = "";
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const response = await page.context().request.get("/api/notifications?limit=1", {
      failOnStatusCode: false,
    });
    lastStatus = response.status();
    lastBody = await response.text();
  }

  expect(lastStatus).toBe(429);
  expect(lastBody).toContain("通知取得の上限");
});
