import { expect, test } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

test.setTimeout(120_000);

test("EMS hospital search shows prioritized cards in descending order", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/hospitals/search");

  const departmentSection = page.locator("section").filter({ hasText: "選定科目カードエリア（必須）" });
  await departmentSection.getByRole("button", { name: /^内科 内科$/ }).click();

  const municipalitySection = page.locator("section").filter({ hasText: "2. 市区名検索" });
  await municipalitySection.getByPlaceholder("例: 新宿区").fill("新宿区");
  await municipalitySection.getByRole("button", { name: "OR検索 実行" }).click();

  await expect(page.getByTestId("hospital-search-results-list")).toBeVisible();
  const rows = page.getByTestId("hospital-search-result-row");
  await expect(rows.first()).toBeVisible();

  const scores = await rows.evaluateAll((elements) =>
    elements
      .slice(0, 5)
      .map((element) => Number(element.getAttribute("data-search-score") ?? "NaN")),
  );

  expect(scores.length).toBeGreaterThan(0);
  for (const score of scores) {
    expect(Number.isFinite(score)).toBeTruthy();
  }
  for (let index = 1; index < scores.length; index += 1) {
    expect(scores[index - 1]).toBeGreaterThanOrEqual(scores[index]);
  }

  await expect(rows.first().getByText("科目一致")).toBeVisible();
  await expect(rows.first().getByText(/タップして選択|選択中/)).toBeVisible();
});
