import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testUsers } from "../support/test-data";

function findingCard(page: Page, label: string): Locator {
  return page.locator('div.rounded-lg.border.border-slate-200.bg-slate-50').filter({ has: page.getByText(label, { exact: true }) }).first();
}

async function setFindingState(card: Locator, stateLabel: "＋" | "－" | "確認困難") {
  await card.getByRole("button", { name: stateLabel, exact: true }).click();
}

async function selectField(card: Locator, fieldLabel: string, value: string) {
  const field = card.locator('label.rounded-lg').filter({ has: card.page().getByText(fieldLabel, { exact: true }) }).first();
  await field.locator("select").selectOption(value);
}

async function fillField(card: Locator, fieldLabel: string, value: string) {
  const field = card.locator('label.rounded-lg').filter({ has: card.page().getByText(fieldLabel, { exact: true }) }).first();
  await field.locator("input").fill(value);
}

async function toggleMulti(card: Locator, fieldLabel: string, option: string) {
  const field = card.locator('div.rounded-lg.border.border-slate-200.bg-white').filter({ has: card.page().getByText(fieldLabel, { exact: true }) }).first();
  await field.getByRole("button", { name: option, exact: true }).click();
}

test("EMS can enter updated A-side findings and review them in patient summary", async ({ page }) => {
  await loginAs(page, testUsers.emsA, "/cases/new");

  await page.getByRole("button", { name: "要請概要・バイタル" }).click();

  const headache = findingCard(page, "頭痛");
  await setFindingState(headache, "＋");
  await selectField(headache, "性状", "その他");
  await fillField(headache, "性状(その他)", "締めつけられる感じ");
  await fillField(headache, "発症時間", "09:30");
  await selectField(headache, "経過", "増悪傾向");

  const convulsion = findingCard(page, "痙攣");
  await setFindingState(convulsion, "＋");
  await selectField(convulsion, "部位", "局所");
  await selectField(convulsion, "局所部位", "顔面");
  await selectField(convulsion, "性状", "間代性");
  await fillField(convulsion, "継続時間", "0130");
  await expect(convulsion.locator('input[placeholder="MM:SS"]').first()).toHaveValue("01:30");

  const chestPain = findingCard(page, "胸痛");
  await setFindingState(chestPain, "＋");
  await toggleMulti(chestPain, "部位", "前胸部");
  await toggleMulti(chestPain, "部位", "背部");
  await fillField(chestPain, "発症時間", "08:10");
  await selectField(chestPain, "経過", "変わらず");

  const palpitation = findingCard(page, "動悸");
  await setFindingState(palpitation, "＋");
  await selectField(palpitation, "発症時行動", "労作時");

  const consciousness = findingCard(page, "意識障害");
  await setFindingState(consciousness, "＋");
  await selectField(consciousness, "普段のレベル", "JCS 1桁");

  const paralysis = findingCard(page, "麻痺");
  await setFindingState(paralysis, "＋");
  await selectField(paralysis, "部位", "右上肢");
  await selectField(paralysis, "麻痺の程度", "不全麻痺");
  await setFindingState(paralysis.locator('div.rounded-lg.border.border-slate-200.bg-white').filter({ has: page.getByText("顔面麻痺", { exact: true }) }).first(), "＋");
  await toggleMulti(paralysis, "顔面麻痺部位", "右口角");
  await toggleMulti(paralysis, "顔面麻痺部位", "左口角");

  await page.getByRole("button", { name: "患者サマリー" }).click();

  await expect(page.getByText("状態変化サマリー")).toBeVisible();
  await page.getByRole("button", { name: /循環器/ }).click();
  await page.getByRole("button", { name: /神経/ }).click();
  await expect(page.getByText("頭痛")).toBeVisible();
  await expect(page.getByText("発症時間 : 09:30")).toBeVisible();
  await expect(page.getByText("経過 : 増悪傾向")).toBeVisible();
  await expect(page.getByText("痙攣")).toBeVisible();
  await expect(page.getByText("局所部位 : 顔面")).toBeVisible();
  await expect(page.getByText("継続時間 : 約2分")).toBeVisible();
  await expect(page.getByText("胸痛")).toBeVisible();
  await expect(page.getByText("部位 : 前胸部、背部")).toBeVisible();
  await expect(page.getByText("動悸")).toBeVisible();
  await expect(page.getByText("発症時行動 : 労作時")).toBeVisible();
  await expect(page.getByText("意識障害")).toBeVisible();
  await expect(page.getByText("普段のレベル : JCS 1桁")).toBeVisible();
  await expect(page.getByText("麻痺", { exact: true })).toBeVisible();
  await expect(page.getByText("麻痺の程度 : 不全麻痺")).toBeVisible();
  await expect(page.getByText("顔面麻痺部位 : 右口角、左口角")).toBeVisible();
});
