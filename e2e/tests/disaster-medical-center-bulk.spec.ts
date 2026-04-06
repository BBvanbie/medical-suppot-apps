import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";

const disasterMedicalCenterUser = {
  username: "hospital_263",
  password: "ChangeMe123!",
} as const;

type HospitalRequestRow = {
  targetId: number;
  caseId: string;
  status: string;
};

async function fetchJson<T>(page: Page, url: string): Promise<T> {
  const response = await page.context().request.get(url);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function fetchHospitalRows(page: Page): Promise<HospitalRequestRow[]> {
  const data = await fetchJson<{ rows?: HospitalRequestRow[] }>(page, "/api/hospitals/requests");
  return data.rows ?? [];
}

test("災害医療センター sees seeded 100-case request patterns and can open detail/consult flows", async ({ page }) => {
  await loginAs(page, disasterMedicalCenterUser, "/hospitals/requests");

  await expect(page.getByRole("heading", { name: "受入要請一覧" })).toBeVisible();
  await expect(page.getByTestId("hospital-requests-table")).toBeVisible();

  const rows = await fetchHospitalRows(page);
  const statuses = new Set(rows.map((row) => row.status));

  expect(rows.length).toBeGreaterThanOrEqual(10);
  expect(statuses.has("UNREAD")).toBeTruthy();
  expect(statuses.has("READ")).toBeTruthy();
  expect(statuses.has("NEGOTIATING")).toBeTruthy();
  expect(statuses.has("ACCEPTABLE")).toBeTruthy();
  expect(statuses.has("NOT_ACCEPTABLE")).toBeTruthy();

  const negotiatingRow = rows.find((row) => row.status === "NEGOTIATING");
  expect(negotiatingRow).toBeTruthy();

  const requestRow = page.locator(
    `[data-testid="hospital-request-row"][data-target-id="${negotiatingRow!.targetId}"]`,
  );
  await expect(requestRow).toBeVisible();
  await requestRow.getByTestId("hospital-request-detail-button").click();

  const detailModal = page.getByTestId("hospital-request-detail-modal");
  await expect(detailModal).toBeVisible();
  await expect(detailModal.getByText("PATIENT SUMMARY").first()).toBeVisible();
  await expect(detailModal.getByText("直近 action")).toBeVisible();
  await expect(detailModal.getByText("次に押せる action")).toBeVisible();

  await detailModal.getByRole("button", { name: "閉じる" }).click();
  await expect(detailModal).not.toBeVisible();

  await requestRow.getByRole("button", { name: "相談" }).click();
  await expect(page.getByText("相談チャット")).toBeVisible();
  await expect(page.getByTestId("hospital-request-consult-send")).toBeVisible();
});

test("災害医療センター sees seeded transport decided cases in patients", async ({ page }) => {
  await loginAs(page, disasterMedicalCenterUser, "/hospitals/patients");

  await expect(page.getByRole("heading", { name: "受入患者一覧" })).toBeVisible();
  await expect(page.getByTestId("hospital-patients-table")).toBeVisible();
  await expect(page.getByText("LOAD-CASE-20260401-061")).toBeVisible();
});
