import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/auth";
import { testTeams, testUsers } from "../support/test-data";

const disasterMedicalCenter = {
  sourceNo: 263,
  name: "災害医療センター",
  username: "hospital_263",
  password: "ChangeMe123!",
} as const;

const CASE_PREFIX = `DMC-DISPATCH-${Date.now()}`;
const REQUEST_PREFIX = `DMC-DISPATCH-REQ-${Date.now()}`;

type Scenario = {
  key: string;
  department: string;
  patientName: string;
  age: number;
  gender: "male" | "female";
  address: string;
  chiefComplaint: string;
  dispatchSummary: string;
  specialNote: string;
  hospitalStatus: "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE";
  hospitalNote?: string;
  hospitalReasonCode?: string;
  emsDecision?: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
  emsReasonCode?: string;
  emsReply?: string;
};

type HospitalRequestRow = {
  targetId: number;
  requestId: string;
  caseId: string;
  status: string;
};

type HospitalRequestDetail = {
  targetId: number;
  caseId: string;
  requestId: string;
  patientSummary: Record<string, unknown> | null;
  selectedDepartments: string[];
  status: string;
};

type ConsultMessage = {
  actor: "HP" | "A";
  note: string;
};

type SendHistoryRow = {
  targetId: number;
  caseId: string;
  rawStatus: string;
  consultComment?: string | null;
  emsReplyComment?: string | null;
};

const scenarios: Scenario[] = [
  {
    key: "NEGOTIATING",
    department: "脳神経外科",
    patientName: "搬送相談 太郎",
    age: 68,
    gender: "male",
    address: "東京都立川市羽衣町1-5-11-201",
    chiefComplaint: "右片麻痺と構音障害",
    dispatchSummary: "本部機動第1が脳卒中疑いで接触。発症時刻は20:40頃。",
    specialNote: "抗凝固薬内服の可能性あり。",
    hospitalStatus: "NEGOTIATING",
    hospitalNote: "CT可否と既往歴を先に共有してください。",
    emsReply: "JCS1、SpO2 94%、高血圧既往あり。搬送継続希望です。",
  },
  {
    key: "DECIDED",
    department: "循環器内科",
    patientName: "搬送決定 花子",
    age: 57,
    gender: "female",
    address: "東京都立川市錦町2-3-4-502",
    chiefComplaint: "胸痛と冷汗",
    dispatchSummary: "急性冠症候群疑い。胸痛持続、冷汗あり。",
    specialNote: "PCI既往あり。",
    hospitalStatus: "ACCEPTABLE",
    emsDecision: "TRANSPORT_DECIDED",
  },
  {
    key: "DECLINED",
    department: "消化器内科",
    patientName: "搬送辞退 次郎",
    age: 74,
    gender: "male",
    address: "東京都立川市曙町3-1-9-901",
    chiefComplaint: "吐血とふらつき",
    dispatchSummary: "消化管出血疑い。顔面蒼白、立位困難。",
    specialNote: "透析中。",
    hospitalStatus: "ACCEPTABLE",
    emsDecision: "TRANSPORT_DECLINED",
    emsReasonCode: "TRANSFERRED_TO_OTHER_HOSPITAL",
  },
  {
    key: "NOT-ACCEPTABLE",
    department: "整形外科",
    patientName: "受入不可 三郎",
    age: 41,
    gender: "male",
    address: "東京都立川市高松町1-8-3-101",
    chiefComplaint: "左下腿変形と疼痛",
    dispatchSummary: "高所転落後の下腿外傷。出血は圧迫で軽減。",
    specialNote: "最終飲食は18:00。",
    hospitalStatus: "NOT_ACCEPTABLE",
    hospitalReasonCode: "NO_BEDS",
  },
];

function buildCaseId(index: number) {
  return `${CASE_PREFIX}-${String(index + 1).padStart(2, "0")}`;
}

function buildRequestId(index: number) {
  return `${REQUEST_PREFIX}-${String(index + 1).padStart(2, "0")}`;
}

function buildPatientSummary(caseId: string, scenario: Scenario) {
  return {
    caseId,
    name: scenario.patientName,
    age: String(scenario.age),
    birthSummary: `${2026 - scenario.age}-04-06`,
    incidentType: "急病",
    teamCode: testTeams.teamA.code,
    teamName: "本部機動第1",
    address: scenario.address,
    phone: "090-1111-2222",
    gender: scenario.gender,
    adl: "自立",
    dnar: "なし",
    allergy: "なし",
    weight: "62",
    relatedPeople: [{ name: "家族連絡先", relation: "配偶者", phone: "090-3333-4444" }],
    pastHistories: [{ disease: "高血圧", clinic: "立川中央病院" }],
    specialNote: scenario.specialNote,
    chiefComplaint: scenario.chiefComplaint,
    dispatchSummary: scenario.dispatchSummary,
    vitals: [
      {
        measuredAt: "21:12",
        consciousnessType: "jcs",
        consciousnessValue: "1",
        respiratoryRate: "24",
        respiratoryPattern: "正常",
        breathOdor: "なし",
        pulseRate: "108",
        ecg: "洞性頻脈",
        arrhythmia: "no",
        bpRightSystolic: "168",
        bpRightDiastolic: "92",
        bpLeftSystolic: "164",
        bpLeftDiastolic: "90",
        spo2: "94",
        pupilRight: "3.0",
        pupilLeft: "3.0",
        lightReflexRight: "あり",
        lightReflexLeft: "あり",
        gazeRight: "なし",
        gazeLeft: "なし",
        temperature: "36.8",
        temperatureUnavailable: false,
      },
      {
        measuredAt: "21:17",
        consciousnessType: "jcs",
        consciousnessValue: "1",
        respiratoryRate: "22",
        respiratoryPattern: "正常",
        breathOdor: "なし",
        pulseRate: "102",
        ecg: "洞性頻脈",
        arrhythmia: "no",
        bpRightSystolic: "162",
        bpRightDiastolic: "88",
        bpLeftSystolic: "160",
        bpLeftDiastolic: "86",
        spo2: "95",
        pupilRight: "3.0",
        pupilLeft: "3.0",
        lightReflexRight: "あり",
        lightReflexLeft: "あり",
        gazeRight: "なし",
        gazeLeft: "なし",
        temperature: "36.7",
        temperatureUnavailable: false,
      },
    ],
    changedFindings: [
      { major: "神経", middle: "意識障害", detail: "状態: + 普段のレベル: JCS 1桁" },
      { major: "神経", middle: "麻痺", detail: "状態: + 部位: 右上肢 / 右下肢 麻痺の程度: 不全麻痺" },
      { major: "循環器", middle: "胸痛", detail: "状態: + 発症時間: 20:40 経過: 変わらず" },
    ],
    updatedAt: new Date().toISOString(),
  };
}

async function createDispatchCase(page: Page, scenario: Scenario, index: number) {
  await page.goto("/dispatch/new");
  await page.getByLabel("隊名").selectOption({ label: `${testTeams.teamA.name} (${testTeams.teamA.code})` });
  await page.getByLabel("覚知日付").fill("2026-04-06");
  await page.getByLabel("覚知時間").fill(`21:${String(12 + index).padStart(2, "0")}`);
  await page.getByLabel("指令先住所").fill(scenario.address);
  await page.getByRole("button", { name: "送信" }).click();

  const successMessage = page.getByText(/新規事案を起票しました。/);
  await expect(successMessage).toBeVisible();
  const successText = (await successMessage.textContent()) ?? "";
  const createdCaseId = successText.match(/\d{8}-\d{3}-\d{2}/)?.[0];
  expect(createdCaseId).toBeTruthy();
  return createdCaseId!;
}

async function saveDetailedCase(page: Page, caseId: string, scenario: Scenario) {
  const patientSummary = buildPatientSummary(caseId, scenario);
  const response = await page.context().request.post("/api/cases", {
    data: {
      caseId,
      division: "1方面",
      awareDate: "2026-04-06",
      awareTime: "21:12",
      patientName: scenario.patientName,
      age: scenario.age,
      address: scenario.address,
      symptom: scenario.chiefComplaint,
      note: scenario.dispatchSummary,
      casePayload: {
        mode: "edit",
        basic: {
          caseId,
          name: scenario.patientName,
          teamCode: testTeams.teamA.code,
          teamName: "本部機動第1",
          gender: scenario.gender,
          calculatedAge: scenario.age,
          ageSummary: String(scenario.age),
          address: scenario.address,
          phone: "090-1111-2222",
          adl: "自立",
          dnarOption: "なし",
          allergy: "なし",
          weight: "62",
          relatedPeople: [{ name: "家族連絡先", relation: "配偶者", phone: "090-3333-4444" }],
          pastHistories: [{ disease: "高血圧", clinic: "立川中央病院" }],
          specialNote: scenario.specialNote,
        },
        summary: {
          incidentType: "急病",
          chiefComplaint: scenario.chiefComplaint,
          dispatchSummary: scenario.dispatchSummary,
        },
        vitals: patientSummary.vitals,
        changedFindings: patientSummary.changedFindings,
        patientSummary,
      },
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function sendHospitalRequest(page: Page, caseId: string, requestId: string, scenario: Scenario) {
  const patientSummary = buildPatientSummary(caseId, scenario);
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
            departments: [scenario.department],
          },
        ],
        selectedDepartments: [scenario.department],
        patientSummary,
      },
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function fetchHospitalRows(page: Page): Promise<HospitalRequestRow[]> {
  const response = await page.context().request.get("/api/hospitals/requests");
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { rows?: HospitalRequestRow[] };
  return (data.rows ?? []).filter((row) => row.requestId?.startsWith(REQUEST_PREFIX));
}

async function fetchHospitalDetail(page: Page, targetId: number) {
  const response = await page.context().request.get(`/api/hospitals/requests/${targetId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as HospitalRequestDetail;
}

async function updateHospitalStatus(page: Page, targetId: number, scenario: Scenario) {
  const response = await page.context().request.patch(`/api/hospitals/requests/${targetId}/status`, {
    data: {
      status: scenario.hospitalStatus,
      note: scenario.hospitalNote,
      reasonCode: scenario.hospitalReasonCode,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function fetchSendHistory(page: Page, caseId: string) {
  const response = await page.context().request.get(`/api/cases/send-history?caseRef=${encodeURIComponent(caseId)}`);
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { rows?: SendHistoryRow[] };
  return data.rows ?? [];
}

async function sendConsultReply(page: Page, targetId: number, note: string) {
  const response = await page.context().request.patch(`/api/cases/consults/${targetId}`, {
    data: { note },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function updateEmsDecision(page: Page, targetId: number, nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED", reasonCode?: string) {
  const response = await page.context().request.patch(`/api/cases/send-history/${targetId}/status`, {
    data: {
      nextStatus,
      reasonCode,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
}

async function fetchConsultMessages(page: Page, targetId: number) {
  const response = await page.context().request.get(`/api/hospitals/requests/${targetId}/consult`);
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { messages?: ConsultMessage[] };
  return data.messages ?? [];
}

test.describe.configure({ mode: "serial" });
test.setTimeout(8 * 60 * 1000);

test("DISPATCH to 本部機動第1 then 災害医療センター roundtrip covers multiple hospital response patterns", async ({ page }) => {
  const createdCases: Array<{ caseId: string; requestId: string; scenario: Scenario }> = [];

  await loginAs(page, testUsers.dispatch, "/dispatch/new");
  for (const [index, scenario] of scenarios.entries()) {
    const caseId = await createDispatchCase(page, scenario, index);
    createdCases.push({ caseId, requestId: buildRequestId(index), scenario });
  }

  await page.goto("/dispatch/cases");
  for (const entry of createdCases) {
    await expect(page.getByRole("cell", { name: entry.caseId })).toBeVisible();
  }

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");
  for (const entry of createdCases) {
    const searchResponse = await page.context().request.get(`/api/cases/search?q=${encodeURIComponent(entry.caseId)}`);
    expect(searchResponse.ok()).toBeTruthy();
    const searchJson = await searchResponse.json();
    expect((searchJson.rows ?? []).some((row: { caseId?: string }) => row.caseId === entry.caseId)).toBeTruthy();

    await saveDetailedCase(page, entry.caseId, entry.scenario);
    await sendHospitalRequest(page, entry.caseId, entry.requestId, entry.scenario);
  }

  await page.context().clearCookies();
  await loginAs(page, disasterMedicalCenter, "/hospitals/requests");

  const hospitalRows = await fetchHospitalRows(page);
  expect(hospitalRows).toHaveLength(scenarios.length);

  const byRequestId = new Map(hospitalRows.map((row) => [row.requestId, row]));
  for (const entry of createdCases) {
    const row = byRequestId.get(entry.requestId);
    expect(row).toBeTruthy();
    const detail = await fetchHospitalDetail(page, row!.targetId);
    expect(detail.caseId).toBe(entry.caseId);
    expect(detail.selectedDepartments).toContain(entry.scenario.department);
    expect(String(detail.patientSummary?.chiefComplaint ?? "")).toContain(entry.scenario.chiefComplaint);
    expect(String(detail.patientSummary?.dispatchSummary ?? "")).toContain(entry.scenario.dispatchSummary);
    await updateHospitalStatus(page, row!.targetId, entry.scenario);
  }

  const negotiatingEntry = createdCases.find((entry) => entry.scenario.hospitalStatus === "NEGOTIATING");
  expect(negotiatingEntry).toBeTruthy();
  const negotiatingTargetId = byRequestId.get(negotiatingEntry!.requestId)!.targetId;
  const consultMessagesBefore = await fetchConsultMessages(page, negotiatingTargetId);
  expect(consultMessagesBefore.some((message) => message.actor === "HP" && message.note.includes("CT可否"))).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/cases/search");

  for (const entry of createdCases) {
    const rows = await fetchSendHistory(page, entry.caseId);
    const target = rows.find((row) => row.caseId === entry.caseId);
    expect(target).toBeTruthy();

    if (entry.scenario.emsReply) {
      await sendConsultReply(page, target!.targetId, entry.scenario.emsReply);
    }
    if (entry.scenario.emsDecision) {
      await updateEmsDecision(page, target!.targetId, entry.scenario.emsDecision, entry.scenario.emsReasonCode);
    }
  }

  const decidedEntry = createdCases.find((entry) => entry.scenario.emsDecision === "TRANSPORT_DECIDED");
  const declinedEntry = createdCases.find((entry) => entry.scenario.emsDecision === "TRANSPORT_DECLINED");
  const notAcceptableEntry = createdCases.find((entry) => entry.scenario.hospitalStatus === "NOT_ACCEPTABLE");
  expect(decidedEntry && declinedEntry && notAcceptableEntry).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, disasterMedicalCenter, "/hospitals/requests");

  const finalRows = await fetchHospitalRows(page);
  expect(finalRows.find((row) => row.requestId === decidedEntry!.requestId)?.status).toBe("TRANSPORT_DECIDED");
  expect(finalRows.find((row) => row.requestId === declinedEntry!.requestId)?.status).toBe("TRANSPORT_DECLINED");
  expect(finalRows.find((row) => row.requestId === notAcceptableEntry!.requestId)?.status).toBe("NOT_ACCEPTABLE");
  expect(finalRows.find((row) => row.requestId === negotiatingEntry!.requestId)?.status).toBe("NEGOTIATING");

  const consultMessagesAfter = await fetchConsultMessages(page, negotiatingTargetId);
  expect(consultMessagesAfter.some((message) => message.actor === "A" && message.note.includes("JCS1"))).toBeTruthy();

  await page.goto("/hospitals/patients");
  await expect(page.getByRole("heading", { name: "受入患者一覧" })).toBeVisible();
  await expect(page.getByText(decidedEntry!.caseId)).toBeVisible();

  await page.goto("/hospitals/declined");
  await expect(page.getByRole("heading", { name: "搬送辞退患者一覧" })).toBeVisible();
  await expect(page.getByText(declinedEntry!.caseId)).toBeVisible();
});
