import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

import { loginAs } from "../support/auth";
import { testHospitals, testTeams, testUsers } from "../support/test-data";

loadEnvConfig(process.cwd());

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

async function expireMciOffer(offerId: number) {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  try {
    await pool.query("UPDATE triage_hospital_offers SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1", [offerId]);
  } finally {
    await pool.end();
  }
}

async function setCurrentMode(page: Page, mode: "LIVE" | "TRAINING") {
  const response = await page.context().request.patch("/api/settings/user-mode", {
    data: { mode },
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.text();
  expect(response.ok(), `${response.status()}: ${body}`).toBeTruthy();
}

async function setOperationalMode(page: Page, operationalMode: "STANDARD" | "TRIAGE") {
  const response = await page.context().request.patch("/api/settings/ambulance/operational-mode", {
    data: { operationalMode },
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
  });
  const body = await response.text();
  expect(response.ok(), `${response.status()}: ${body}`).toBeTruthy();
}

async function readJson<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}

async function createTriageDispatchReport(page: Page, address: string, memo: string) {
  await page.goto("/cases/new");
  await expect(page.getByTestId("ems-case-triage-note")).toBeVisible();
  await page.getByLabel("指令先住所").fill(address);
  await page.getByRole("button", { name: "最小バイタル" }).click();
  await page.getByLabel("主訴・観察メモ").fill(memo);
  await page.getByRole("button", { name: "本部へ報告" }).click();
  await page.waitForURL(/\/cases\/search/);
}

test("MCI P0 safety blocks expired offers and capacity overflow, then completes handoff after commander transition", async ({ page }) => {
  test.setTimeout(240_000);
  const address = `新宿区西新宿2-8-1 MCI-P0-SAFETY-${Date.now()}`;

  await loginAs(page, testUsers.emsA, "/cases/new");
  await setCurrentMode(page, "LIVE");
  await setOperationalMode(page, "TRIAGE");
  await createTriageDispatchReport(page, address, "MCI P0 safety 第一報 A 赤1 緑2");
  await setOperationalMode(page, "STANDARD");

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsB, "/cases/new");
  await setCurrentMode(page, "LIVE");
  await setOperationalMode(page, "TRIAGE");
  await createTriageDispatchReport(page, address, "MCI P0 safety 第一報 B 赤1 緑2");
  await setOperationalMode(page, "STANDARD");

  await page.context().clearCookies();
  await loginAs(page, testUsers.dispatch, "/dispatch/cases");
  await setCurrentMode(page, "LIVE");

  const dispatchRowsResponse = await page.context().request.get("/api/dispatch/cases");
  expect(dispatchRowsResponse.ok(), await dispatchRowsResponse.text()).toBeTruthy();
  const dispatchRowsData = await readJson<{
    rows?: Array<{ caseId: string; dispatchAddress: string; teamName: string }>;
  }>(dispatchRowsResponse);
  const dispatchCases = (dispatchRowsData.rows ?? []).filter((row) => row.dispatchAddress === address);
  expect(dispatchCases.length).toBeGreaterThanOrEqual(2);
  const commanderSourceCase = dispatchCases.find((row) => row.teamName === testTeams.teamA.name) ?? dispatchCases[0];

  const mciGetResponse = await page.context().request.get(
    `/api/dispatch/cases/${encodeURIComponent(commanderSourceCase.caseId)}/mci-incident`,
  );
  expect(mciGetResponse.ok(), await mciGetResponse.text()).toBeTruthy();
  const mciGetData = await readJson<{
    candidates?: Array<{ teamId: number; teamName: string; isSourceTeam: boolean }>;
  }>(mciGetResponse);
  expect(mciGetData.candidates?.length).toBeGreaterThanOrEqual(2);
  const commandTeamId = mciGetData.candidates?.find((team) => team.teamName === testTeams.teamA.name)?.teamId ?? mciGetData.candidates![0].teamId;
  const transportTeamId = mciGetData.candidates?.find((team) => team.teamName === testTeams.teamB.name)?.teamId
    ?? mciGetData.candidates!.find((team) => team.teamId !== commandTeamId)!.teamId;

  const approveResponse = await page.context().request.post(
    `/api/dispatch/cases/${encodeURIComponent(commanderSourceCase.caseId)}/mci-incident`,
    {
      data: {
        summary: "MCI P0 safety。期限、枠、統括交代、引継を検証する。",
        notes: "P0 safety E2E",
        startCounts: { red: 1, yellow: 0, green: 2, black: 0 },
        patCounts: { red: 1, yellow: 0, green: 2, black: 0 },
        commandTeamId,
        selectedTeamIds: mciGetData.candidates!.map((team) => team.teamId),
      },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(approveResponse.ok(), await approveResponse.text()).toBeTruthy();
  const approveData = await readJson<{ incident?: { id: number; incidentCode: string } }>(approveResponse);
  const incidentId = approveData.incident!.id;

  const hospitalRequestResponse = await page.context().request.post(`/api/dispatch/mci-incidents/${incidentId}/hospital-requests`, {
    data: { hospitals: [{ hospitalId: 990001, hospitalName: testHospitals.hospitalA }] },
    headers: { "Content-Type": "application/json" },
  });
  expect(hospitalRequestResponse.ok(), await hospitalRequestResponse.text()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
  await setCurrentMode(page, "LIVE");
  const requestsResponse = await page.context().request.get("/api/hospitals/mci-requests");
  expect(requestsResponse.ok(), await requestsResponse.text()).toBeTruthy();
  const requestsData = await readJson<{ rows?: Array<{ id: number; incidentCode: string }> }>(requestsResponse);
  const request = (requestsData.rows ?? []).find((row) => row.incidentCode === approveData.incident!.incidentCode);
  expect(request).toBeTruthy();
  const offerResponse = await page.context().request.patch(`/api/hospitals/mci-requests/${request!.id}`, {
    data: {
      status: "ACCEPTABLE",
      capacities: { red: 1, yellow: 0, green: 1, black: 0 },
      notes: "P0 safety 1枠のみ",
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(offerResponse.ok(), await offerResponse.text()).toBeTruthy();
  const offerData = await readJson<{ row?: { offer?: { id: number; green: number; expiresAt: string } | null } }>(offerResponse);
  const offerId = offerData.row!.offer!.id;
  expect(offerData.row!.offer!.green).toBe(1);
  expect(offerData.row!.offer!.expiresAt).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsB, "/paramedics");
  await setCurrentMode(page, "LIVE");
  const provisionalResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/provisional-patients`, {
    data: {
      currentTag: "GREEN",
      startTag: "GREEN",
      patTag: "GREEN",
      injuryDetails: "非統括隊からの仮登録 軽症",
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(provisionalResponse.ok(), await provisionalResponse.text()).toBeTruthy();
  const provisionalData = await readJson<{ patient?: { id: number; patientNo: string | null; provisionalPatientNo: string } }>(
    provisionalResponse,
  );
  expect(provisionalData.patient?.patientNo).toBeNull();
  expect(provisionalData.patient?.provisionalPatientNo).toMatch(/^TMP-/);

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/paramedics");
  await setCurrentMode(page, "LIVE");
  const approvePatientResponse = await page.context().request.post(
    `/api/ems/mci-incidents/${incidentId}/patients/${provisionalData.patient!.id}/review`,
    {
      data: { action: "APPROVE", reason: "現場統括が確認" },
      headers: { "Content-Type": "application/json" },
    },
  );
  expect(approvePatientResponse.ok(), await approvePatientResponse.text()).toBeTruthy();
  const approvedPatientData = await readJson<{ patient?: { id: number; patientNo: string; registrationStatus: string } }>(
    approvePatientResponse,
  );
  expect(approvedPatientData.patient?.patientNo).toMatch(/^P-\d{3}$/);
  expect(approvedPatientData.patient?.registrationStatus).toBe("CONFIRMED");

  await expireMciOffer(offerId);
  const expiredAssignmentResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/transport-assignments`, {
    data: {
      targetTeamId: transportTeamId,
      hospitalOfferId: offerId,
      patientIds: [approvedPatientData.patient!.id],
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(expiredAssignmentResponse.status()).toBe(409);
  const expiredData = await readJson<{ code?: string }>(expiredAssignmentResponse);
  expect(expiredData.code).toBe("OFFER_EXPIRED");

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
  await setCurrentMode(page, "LIVE");
  const renewOfferResponse = await page.context().request.patch(`/api/hospitals/mci-requests/${request!.id}`, {
    data: {
      status: "ACCEPTABLE",
      capacities: { red: 1, yellow: 0, green: 1, black: 0 },
      notes: "P0 safety 期限更新",
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(renewOfferResponse.ok(), await renewOfferResponse.text()).toBeTruthy();
  const renewOfferData = await readJson<{ row?: { offer?: { id: number } | null } }>(renewOfferResponse);
  const renewedOfferId = renewOfferData.row!.offer!.id;

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/paramedics");
  await setCurrentMode(page, "LIVE");
  const secondPatientResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/patients`, {
    data: {
      currentTag: "GREEN",
      startTag: "GREEN",
      patTag: "GREEN",
      injuryDetails: "統括隊登録 軽症",
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(secondPatientResponse.ok(), await secondPatientResponse.text()).toBeTruthy();
  const secondPatientData = await readJson<{ patient?: { id: number } }>(secondPatientResponse);

  const capacityOverflowResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/transport-assignments`, {
    data: {
      targetTeamId: transportTeamId,
      hospitalOfferId: renewedOfferId,
      patientIds: [approvedPatientData.patient!.id, secondPatientData.patient!.id],
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(capacityOverflowResponse.status()).toBe(409);
  const capacityOverflowData = await readJson<{ code?: string }>(capacityOverflowResponse);
  expect(capacityOverflowData.code).toBe("CAPACITY_EXCEEDED");

  const assignmentResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/transport-assignments`, {
    data: {
      targetTeamId: transportTeamId,
      hospitalOfferId: renewedOfferId,
      patientIds: [approvedPatientData.patient!.id],
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(assignmentResponse.ok(), await assignmentResponse.text()).toBeTruthy();
  const assignmentData = await readJson<{ assignment?: { id: number; status: string } }>(assignmentResponse);
  expect(assignmentData.assignment?.status).toBe("SENT_TO_TEAM");

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsB, "/paramedics");
  await setCurrentMode(page, "LIVE");
  const nonCommanderCreateResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/patients`, {
    data: { currentTag: "GREEN", startTag: "GREEN", patTag: "GREEN", injuryDetails: "権限外登録" },
    headers: { "Content-Type": "application/json" },
  });
  expect(nonCommanderCreateResponse.status()).toBe(403);
  expect((await readJson<{ code?: string }>(nonCommanderCreateResponse)).code).toBe("COMMANDER_REQUIRED");

  const decisionResponse = await page.context().request.patch(`/api/ems/mci-transport-assignments/${assignmentData.assignment!.id}/decision`, {
    headers: { "Content-Type": "application/json" },
  });
  expect(decisionResponse.ok(), await decisionResponse.text()).toBeTruthy();
  const departResponse = await page.context().request.patch(`/api/ems/mci-transport-assignments/${assignmentData.assignment!.id}/status`, {
    data: { status: "DEPARTED" },
    headers: { "Content-Type": "application/json" },
  });
  expect(departResponse.ok(), await departResponse.text()).toBeTruthy();
  const arriveResponse = await page.context().request.patch(`/api/ems/mci-transport-assignments/${assignmentData.assignment!.id}/status`, {
    data: { status: "ARRIVED" },
    headers: { "Content-Type": "application/json" },
  });
  expect(arriveResponse.ok(), await arriveResponse.text()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
  await setCurrentMode(page, "LIVE");
  const handoffResponse = await page.context().request.patch(`/api/hospitals/mci-transports/${assignmentData.assignment!.id}/handoff`, {
    headers: { "Content-Type": "application/json" },
  });
  expect(handoffResponse.ok(), await handoffResponse.text()).toBeTruthy();
  const handoffData = await readJson<{ assignment?: { status: string } }>(handoffResponse);
  expect(handoffData.assignment?.status).toBe("HANDOFF_COMPLETED");

  await page.context().clearCookies();
  await loginAs(page, testUsers.dispatch, "/dispatch/cases");
  await setCurrentMode(page, "LIVE");
  const transitionResponse = await page.context().request.post(`/api/dispatch/mci-incidents/${incidentId}/command-transitions`, {
    data: { toTeamId: transportTeamId, reason: "統括交代E2E" },
    headers: { "Content-Type": "application/json" },
  });
  expect(transitionResponse.ok(), await transitionResponse.text()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsA, "/paramedics");
  await setCurrentMode(page, "LIVE");
  const oldCommanderResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/patients`, {
    data: { currentTag: "RED", startTag: "RED", patTag: "RED", injuryDetails: "旧統括の権限外登録" },
    headers: { "Content-Type": "application/json" },
  });
  expect(oldCommanderResponse.status()).toBe(403);
  expect((await readJson<{ code?: string }>(oldCommanderResponse)).code).toBe("COMMANDER_REQUIRED");

  await page.context().clearCookies();
  await loginAs(page, testUsers.emsB, "/paramedics");
  await setCurrentMode(page, "LIVE");
  const newCommanderResponse = await page.context().request.post(`/api/ems/mci-incidents/${incidentId}/patients`, {
    data: { currentTag: "RED", startTag: "RED", patTag: "RED", injuryDetails: "新統括が登録" },
    headers: { "Content-Type": "application/json" },
  });
  expect(newCommanderResponse.ok(), await newCommanderResponse.text()).toBeTruthy();

  await page.context().clearCookies();
  await loginAs(page, testUsers.dispatch, "/dispatch/cases");
  await setCurrentMode(page, "LIVE");
  const normalCloseResponse = await page.context().request.post(`/api/dispatch/mci-incidents/${incidentId}/close`, {
    data: { closureType: "NORMAL" },
    headers: { "Content-Type": "application/json" },
  });
  expect(normalCloseResponse.status()).toBe(409);
  expect((await readJson<{ code?: string }>(normalCloseResponse)).code).toBe("INCIDENT_CLOSE_BLOCKED");

  const forcedCloseResponse = await page.context().request.post(`/api/dispatch/mci-incidents/${incidentId}/close`, {
    data: { closureType: "FORCED", reason: "P0 safety E2Eでは未割当患者を残して終了ブロックを検証したため" },
    headers: { "Content-Type": "application/json" },
  });
  expect(forcedCloseResponse.ok(), await forcedCloseResponse.text()).toBeTruthy();
  const forcedCloseData = await readJson<{ status?: string; report?: { closureType?: string } }>(forcedCloseResponse);
  expect(forcedCloseData.status).toBe("CLOSED");
  expect(forcedCloseData.report?.closureType).toBe("FORCED");

  const auditResponse = await page.context().request.get(`/api/dispatch/mci-incidents/${incidentId}/audit-events`);
  expect(auditResponse.ok(), await auditResponse.text()).toBeTruthy();
  const auditData = await readJson<{ rows?: Array<{ eventType: string }> }>(auditResponse);
  const eventTypes = new Set((auditData.rows ?? []).map((row) => row.eventType));
  expect(eventTypes.has("PATIENT_PROVISIONAL_CREATED")).toBeTruthy();
  expect(eventTypes.has("PATIENT_PROVISIONAL_APPROVE")).toBeTruthy();
  expect(eventTypes.has("TRANSPORT_ASSIGNMENT_CREATED")).toBeTruthy();
  expect(eventTypes.has("TRANSPORT_HANDOFF_COMPLETED")).toBeTruthy();
  expect(eventTypes.has("COMMAND_TEAM_TRANSITIONED")).toBeTruthy();
  expect(eventTypes.has("INCIDENT_CLOSED")).toBeTruthy();
});
