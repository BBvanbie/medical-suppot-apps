import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testTeams, testUsers } from "../support/test-data";

test("DISPATCH can create a case and the assigned EMS team sees it in search", async ({ page }) => {
  await loginAs(page, testUsers.dispatch, "/dispatch/new");

  await expect(page.getByRole("heading", { name: "指令起票" })).toBeVisible();
  await page.getByLabel("隊名").selectOption({ label: `${testTeams.teamA.name} (${testTeams.teamA.code})` });
  await page.getByLabel("覚知日付").fill("2026-03-24");
  await page.getByLabel("覚知時間").fill("09:45");
  await page.getByLabel("指令先住所").fill("東京都千代田区E2E Dispatch 9-9-9");
  await page.getByRole("button", { name: "送信" }).click();

  const successMessage = page.getByText(/新規事案を起票しました。/);
  await expect(successMessage).toBeVisible();
  const successText = (await successMessage.textContent()) ?? "";
  const createdCaseId = successText.match(/\d{8}-\d{3}-\d{2}/)?.[0];
  expect(createdCaseId).toBeTruthy();

  await page.goto("/dispatch/cases");
  await expect(page.getByRole("heading", { name: "指令一覧" })).toBeVisible();
  await expect(page.getByRole("cell", { name: createdCaseId! })).toBeVisible();
  await expect(page.getByText("東京都千代田区E2E Dispatch 9-9-9")).toBeVisible();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");
  await expect(page.getByTestId("ems-cases-table")).toBeVisible();
  await expect(page.locator(`[data-testid="ems-case-row"][data-case-id="${createdCaseId!}"]`)).toBeVisible();
  await expect(page.getByText("東京都千代田区E2E Dispatch 9-9-9")).toBeVisible();
});

test("HOSPITAL user cannot access dispatch APIs", async ({ page }) => {
  await loginAs(page, testUsers.hospitalA, "/hospitals");

  const response = await page.context().request.get("/api/dispatch/cases");
  expect(response.status()).toBe(403);
});
