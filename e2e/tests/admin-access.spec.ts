import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

test("unauthenticated users cannot open admin pages directly", async ({ page }) => {
  await page.goto("/admin/monitoring");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("ADMIN MONITORING")).toHaveCount(0);
});

test("EMS users cannot open admin pages directly", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/search");

  await page.goto("/admin/monitoring");

  await expect(page).toHaveURL(/\/paramedics/);
  await expect(page.getByText("ADMIN MONITORING")).toHaveCount(0);
});

test("ADMIN users can open admin pages directly", async ({ page }) => {
  await loginAs(page, testUsers.admin, "/admin/monitoring");

  await expect(page).toHaveURL(/\/admin\/monitoring/);
  await expect(page.getByText("ADMIN MONITORING")).toBeVisible();
});
