import { execFileSync } from "node:child_process";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";

const repoRoot = path.resolve(__dirname, "../..");
const disasterMedicalCenter = {
  sourceNo: 263,
  name: "災害医療センター",
  username: "hospital_263",
  password: "ChangeMe123!",
} as const;

const emsOperator = {
  username: "e2e_ems_a",
  password: "Passw0rd!",
} as const;

const CASE_PREFIX = `DMC-L50-${Date.now()}`;
const REQUEST_PREFIX = `DMC-REQ-${Date.now()}`;
const SEQUENTIAL_CASES = 25;
const CONCURRENT_CASES = 25;
const TOTAL_CASES = SEQUENTIAL_CASES + CONCURRENT_CASES;

type HospitalRequestRow = {
  targetId: number;
  caseId: string;
  requestId: string;
  status: string;
};

function runLoadCommand(args: string[]) {
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
    throw new Error(`load command failed: node scripts/manage_case_load_test_data.js ${args.join(" ")}\n${output}`);
  }
}

async function createCase(page: Page, caseId: string) {
  const response = await page.context().request.post("/api/cases", {
    data: {
      caseId,
      division: "1方面",
      awareDate: "2026-04-06",
      awareTime: "14:00",
      patientName: `災害医療患者 ${caseId.slice(-3)}`,
      age: 52,
      address: `東京都立川市緑町3256-${caseId.slice(-3)}`,
      symptom: "呼吸苦",
      casePayload: {
        basic: {
          caseId,
          name: `災害医療患者 ${caseId.slice(-3)}`,
          gender: "male",
          age: 52,
          calculatedAge: 52,
          address: `東京都立川市緑町3256-${caseId.slice(-3)}`,
          symptom: "呼吸苦",
        },
      },
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function sendHospitalRequest(page: Page, caseId: string, requestId: string) {
  const response = await page.context().request.post("/api/cases/send-history", {
    data: {
      caseRef: caseId,
      item: {
        requestId,
        caseId,
        sentAt: new Date().toISOString(),
        hospitalCount: 1,
        hospitalNames: [disasterMedicalCenter.name],
        hospitals: [
          {
            hospitalId: disasterMedicalCenter.sourceNo,
            hospitalName: disasterMedicalCenter.name,
            departments: ["内科"],
          },
        ],
        selectedDepartments: ["内科"],
        patientSummary: {
          name: `災害医療患者 ${caseId.slice(-3)}`,
          age: 52,
          address: `東京都立川市緑町3256-${caseId.slice(-3)}`,
        },
      },
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function fetchHospitalRequests(page: Page): Promise<HospitalRequestRow[]> {
  const response = await page.context().request.get("/api/hospitals/requests");
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { rows?: HospitalRequestRow[] };
  return (data.rows ?? []).filter((row) => row.caseId?.startsWith(CASE_PREFIX));
}

async function fetchHospitalPatients(page: Page) {
  const response = await page.context().request.get("/hospitals/patients");
  expect(response.ok()).toBeTruthy();
  return response.text();
}

async function updateHospitalStatus(
  page: Page,
  targetId: number,
  status: "READ" | "NEGOTIATING" | "ACCEPTABLE",
  note?: string,
) {
  const response = await page.context().request.patch(`/api/hospitals/requests/${targetId}/status`, {
    data: {
      status,
      note,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function updateEmsDecision(page: Page, targetId: number, nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") {
  const response = await page.context().request.patch(`/api/cases/send-history/${targetId}/status`, {
    data: {
      nextStatus,
      reasonCode: nextStatus === "TRANSPORT_DECLINED" ? "PATIENT_CIRCUMSTANCES" : undefined,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe.configure({ mode: "serial" });
test.setTimeout(10 * 60 * 1000);

test.beforeAll(() => {
  runLoadCommand(["reset"]);
});

test("EMS sends 25 cases sequentially to 災害医療センター", async ({ page }) => {
  await loginAs(page, emsOperator, "/cases/search");

  for (let index = 1; index <= SEQUENTIAL_CASES; index += 1) {
    const suffix = String(index).padStart(3, "0");
    const caseId = `${CASE_PREFIX}-S-${suffix}`;
    const requestId = `${REQUEST_PREFIX}-S-${suffix}`;
    await createCase(page, caseId);
    await sendHospitalRequest(page, caseId, requestId);
  }

  await page.context().clearCookies();
  await loginAs(page, disasterMedicalCenter, "/hospitals/requests");
  const rows = await fetchHospitalRequests(page);
  expect(rows).toHaveLength(SEQUENTIAL_CASES);
  expect(rows.every((row) => row.status === "UNREAD")).toBeTruthy();
});

test("EMS sends 25 cases concurrently to 災害医療センター", async ({ page }) => {
  await loginAs(page, emsOperator, "/cases/search");

  await Promise.all(
    Array.from({ length: CONCURRENT_CASES }, async (_, offset) => {
      const index = SEQUENTIAL_CASES + offset + 1;
      const suffix = String(index).padStart(3, "0");
      const caseId = `${CASE_PREFIX}-C-${suffix}`;
      const requestId = `${REQUEST_PREFIX}-C-${suffix}`;
      await createCase(page, caseId);
      await sendHospitalRequest(page, caseId, requestId);
    }),
  );

  await page.context().clearCookies();
  await loginAs(page, disasterMedicalCenter, "/hospitals/requests");
  const rows = await fetchHospitalRequests(page);
  expect(rows).toHaveLength(TOTAL_CASES);
});

test("災害医療センター and EMS process the 50-case load with sequential and concurrent updates", async ({ page }) => {
  await loginAs(page, disasterMedicalCenter, "/hospitals/requests");

  const initialRows = await fetchHospitalRequests(page);
  expect(initialRows).toHaveLength(TOTAL_CASES);

  const sequentialReadTargets = initialRows.slice(0, 10);
  for (const row of sequentialReadTargets) {
    await updateHospitalStatus(page, row.targetId, "READ");
  }

  const concurrentAcceptTargets = initialRows.slice(10, 20);
  await Promise.all(concurrentAcceptTargets.map((row) => updateHospitalStatus(page, row.targetId, "ACCEPTABLE")));

  const concurrentNegotiatingTargets = initialRows.slice(20, 25);
  await Promise.all(
    concurrentNegotiatingTargets.map((row, index) =>
      updateHospitalStatus(page, row.targetId, "NEGOTIATING", `同時相談 ${index + 1}`),
    ),
  );

  let updatedRows = await fetchHospitalRequests(page);
  expect(updatedRows.filter((row) => row.status === "READ")).toHaveLength(10);
  expect(updatedRows.filter((row) => row.status === "ACCEPTABLE")).toHaveLength(10);
  expect(updatedRows.filter((row) => row.status === "NEGOTIATING")).toHaveLength(5);

  await page.context().clearCookies();
  await loginAs(page, emsOperator, "/cases/search");

  const acceptedTargets = updatedRows.filter((row) => row.status === "ACCEPTABLE");
  for (const row of acceptedTargets.slice(0, 5)) {
    await updateEmsDecision(page, row.targetId, "TRANSPORT_DECIDED");
  }
  await Promise.all(acceptedTargets.slice(5, 10).map((row) => updateEmsDecision(page, row.targetId, "TRANSPORT_DECLINED")));

  await page.context().clearCookies();
  await loginAs(page, disasterMedicalCenter, "/hospitals/requests");
  updatedRows = await fetchHospitalRequests(page);

  expect(updatedRows.filter((row) => row.status === "TRANSPORT_DECIDED")).toHaveLength(5);
  expect(updatedRows.filter((row) => row.status === "TRANSPORT_DECLINED")).toHaveLength(5);
  expect(updatedRows.filter((row) => row.status === "NEGOTIATING")).toHaveLength(5);
  expect(updatedRows.filter((row) => row.status === "READ")).toHaveLength(10);

  await page.goto("/hospitals/patients");
  await expect(page.getByRole("heading", { name: "受入患者一覧" })).toBeVisible();
  const patientsHtml = await fetchHospitalPatients(page);
  expect((patientsHtml.match(new RegExp(CASE_PREFIX, "g")) ?? []).length).toBeGreaterThanOrEqual(5);
});
