import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

test("EMS settings pages render the workbench header and key actions", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/settings/sync");

  await expect(page.getByRole("heading", { name: "同期設定" })).toBeVisible();
  await expect(page.getByText("SETTINGS WORKBENCH")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "未送信キューを開く" }).first()).toBeVisible();

  await page.goto("/settings/support");
  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();
  await expect(page.getByText("SETTINGS WORKBENCH")).toBeVisible();
  await expect(page.getByText("操作マニュアル")).toBeVisible();
});

test("HOSPITAL settings pages render the workbench header and read-only support info", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hp/settings/support");

  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();
  await expect(page.getByText("SETTINGS WORKBENCH")).toBeVisible();
  await expect(page.getByText("問い合わせ窓口")).toBeVisible();

  await page.goto("/hp/settings/facility");
  await expect(page.getByRole("heading", { name: "施設情報" })).toBeVisible();
  await expect(page.getByText("管理対象情報")).toBeVisible();
  await expect(page.getByText("運用向け補足情報")).toBeVisible();
});

test("DISPATCH pages render the updated workbench header on create and list routes", async ({ page }) => {
  await loginAs(page, testUsers.dispatch, "/dispatch/new");

  await expect(page.getByRole("heading", { name: "指令起票" })).toBeVisible();
  await expect(page.getByText("DISPATCH WORKBENCH")).toBeVisible();
  await expect(page.getByText("DISPATCH FLOW")).toBeVisible();

  await page.goto("/dispatch/cases");
  await expect(page.getByRole("heading", { name: "指令一覧" })).toBeVisible();
  await expect(page.getByText("DISPATCH WORKBENCH")).toBeVisible();
  await expect(page.getByText("ROSTER VIEW")).toBeVisible();
});
