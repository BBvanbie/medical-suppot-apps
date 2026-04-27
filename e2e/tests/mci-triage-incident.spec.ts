import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { Pool, type PoolClient } from "pg";

import { loginAs } from "../support/auth";
import { testHospitals, testTeams, testUsers } from "../support/test-data";

const MCI50_PASSWORD = "Passw0rd!";
const MCI50_CASE_PREFIX = "E2E-MCI50";
const MCI50_ADDRESS = "立川市緑町3256 E2E-MCI50 大規模災害現場";
const MCI50_HOSPITAL_SOURCE_NOS = [992001, 992002] as const;
const MCI50_TEAM_DEFINITIONS = [
  { name: "本部機動第一", division: "本部機動" },
  { name: "三鷹", division: "8方面" },
  { name: "下連雀", division: "8方面" },
  { name: "府中", division: "8方面" },
  { name: "小金井", division: "8方面" },
  { name: "田無", division: "8方面" },
  { name: "西東京", division: "8方面" },
  { name: "武蔵野", division: "8方面" },
  { name: "武蔵野デイタイム", division: "8方面" },
  { name: "府中大規模", division: "8方面" },
  { name: "調布", division: "8方面" },
] as const;
const MCI50_HOSPITAL_DEFINITIONS = [
  {
    name: "災害医療センター",
    sourceNo: MCI50_HOSPITAL_SOURCE_NOS[0],
    username: "e2e_mci50_hospital_disaster",
    capacities: { red: 5, yellow: 8, green: 12, black: 0 },
  },
  {
    name: "東京医療センター",
    sourceNo: MCI50_HOSPITAL_SOURCE_NOS[1],
    username: "e2e_mci50_hospital_tokyo",
    capacities: { red: 5, yellow: 7, green: 13, black: 0 },
  },
] as const;

loadEnvConfig(process.cwd());

type TriageTag = "RED" | "YELLOW" | "GREEN" | "BLACK";

type Mci50TeamSeed = {
  id: number;
  name: string;
  code: string;
  username: string;
  password: string;
};

type Mci50HospitalSeed = {
  dbId: number;
  name: string;
  sourceNo: number;
  username: string;
  password: string;
  capacities: { red: number; yellow: number; green: number; black: number };
};

type Mci50Seed = {
  sourceCaseId: string;
  address: string;
  teams: Mci50TeamSeed[];
  hospitals: Mci50HospitalSeed[];
};

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

async function withMci50Client<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
    await pool.end();
  }
}

async function cleanupMci50Seed(client: PoolClient) {
  const incidentIdsRes = await client.query<{ id: number }>(
    `
      SELECT i.id
      FROM triage_incidents i
      LEFT JOIN cases c ON c.case_uid = i.source_case_uid
      WHERE c.case_id LIKE $1
         OR i.address = $2
    `,
    [`${MCI50_CASE_PREFIX}-%`, MCI50_ADDRESS],
  );
  const incidentIds = incidentIdsRes.rows.map((row) => row.id);

  if (incidentIds.length > 0) {
    await client.query("DELETE FROM triage_patients WHERE incident_id = ANY($1::bigint[])", [incidentIds]);
    await client.query("DELETE FROM triage_transport_assignments WHERE incident_id = ANY($1::bigint[])", [incidentIds]);
    await client.query(
      `
        DELETE FROM triage_hospital_offers
        WHERE request_id IN (
          SELECT id
          FROM triage_hospital_requests
          WHERE incident_id = ANY($1::bigint[])
        )
      `,
      [incidentIds],
    );
    await client.query("DELETE FROM triage_hospital_requests WHERE incident_id = ANY($1::bigint[])", [incidentIds]);
    await client.query("DELETE FROM triage_incident_teams WHERE incident_id = ANY($1::bigint[])", [incidentIds]);
    await client.query("DELETE FROM triage_incidents WHERE id = ANY($1::bigint[])", [incidentIds]);
  }

  await client.query(
    `
      DELETE FROM notifications
      WHERE case_id LIKE $1
         OR dedupe_key LIKE 'mci-transport-assignment:%'
         OR dedupe_key LIKE 'mci-transport-decided:%'
    `,
    [`${MCI50_CASE_PREFIX}-%`],
  );
  await client.query("DELETE FROM cases WHERE case_id LIKE $1 OR address = $2", [`${MCI50_CASE_PREFIX}-%`, MCI50_ADDRESS]);
  await client.query("DELETE FROM login_attempts WHERE username LIKE 'e2e_mci50_%'");
  await client.query("DELETE FROM users WHERE username LIKE 'e2e_mci50_%'");
  await client.query("DELETE FROM hospitals WHERE source_no = ANY($1::int[])", [[...MCI50_HOSPITAL_SOURCE_NOS]]);
  await client.query("DELETE FROM emergency_teams WHERE team_code LIKE 'E2E-MCI50-TEAM-%'");
}

async function seedMci50Scenario(): Promise<Mci50Seed> {
  const passwordHash = await hash(MCI50_PASSWORD, 10);

  return withMci50Client(async (client) => {
    await client.query("BEGIN");
    try {
      await cleanupMci50Seed(client);

      const teams: Mci50TeamSeed[] = [];
      for (const [index, definition] of MCI50_TEAM_DEFINITIONS.entries()) {
        const ordinal = String(index + 1).padStart(2, "0");
        const code = `E2E-MCI50-TEAM-${ordinal}`;
        const username = `e2e_mci50_ems_${ordinal}`;
        const teamRes = await client.query<{ id: number }>(
          `
            INSERT INTO emergency_teams (
              team_code, team_name, division, is_active, display_order, phone, case_number_code
            ) VALUES ($1, $2, $3, TRUE, $4, $5, $6)
            RETURNING id
          `,
          [code, definition.name, definition.division, index + 20, `03-3350-${String(index + 1).padStart(4, "0")}`, String(950 + index)],
        );
        const teamId = teamRes.rows[0]?.id;
        if (!teamId) throw new Error(`Failed to seed MCI50 team ${definition.name}.`);

        await client.query(
          `
            INSERT INTO users (username, password_hash, role, display_name, team_id, hospital_id, is_active, updated_at)
            VALUES ($1, $2, 'EMS', $3, $4, NULL, TRUE, NOW())
          `,
          [username, passwordHash, `${definition.name} E2E`, teamId],
        );

        const caseId = `${MCI50_CASE_PREFIX}-CASE-${ordinal}`;
        const caseUid = `${MCI50_CASE_PREFIX.toLowerCase()}-case-${ordinal}`;
        const memo = `${definition.name} 大規模災害第一報 赤10 黄15 緑25`;
        const casePayload = {
          basic: {
            caseId,
            name: `MCI50 傷病者代表 ${ordinal}`,
            gender: "unknown",
            age: null,
            calculatedAge: null,
            address: MCI50_ADDRESS,
            teamCode: code,
            teamName: definition.name,
          },
          summary: {
            chiefComplaint: memo,
            dispatchSummary: memo,
            triageDispatchReport: true,
            triageWorkflow: "DISPATCH_COORDINATED",
            triageMode: true,
          },
          triage: {
            startCounts: { red: 10, yellow: 15, green: 25, black: 0 },
            patCounts: { red: 10, yellow: 15, green: 25, black: 0 },
          },
          vitals: [],
        };
        await client.query(
          `
            INSERT INTO cases (
              case_id, case_uid, mode, division, aware_date, aware_time, patient_name, age,
              address, symptom, destination, note, team_id, case_payload, updated_at
            ) VALUES (
              $1, $2, 'LIVE', $3, '2026-04-27', $4::time, $5, NULL,
              $6, $7, NULL, $8, $9, $10::jsonb, NOW()
            )
          `,
          [
            caseId,
            caseUid,
            definition.division,
            `09:${String(index).padStart(2, "0")}`,
            `MCI50 代表 ${ordinal}`,
            MCI50_ADDRESS,
            "大規模災害第一報",
            memo,
            teamId,
            JSON.stringify(casePayload),
          ],
        );

        teams.push({ id: teamId, name: definition.name, code, username, password: MCI50_PASSWORD });
      }

      const hospitals: Mci50HospitalSeed[] = [];
      for (const [index, definition] of MCI50_HOSPITAL_DEFINITIONS.entries()) {
        const hospitalRes = await client.query<{ id: number }>(
          `
            INSERT INTO hospitals (source_no, municipality, name, postal_code, address, phone, is_active, display_order)
            VALUES ($1, '東京', $2, $3, $4, $5, TRUE, $6)
            RETURNING id
          `,
          [
            definition.sourceNo,
            definition.name,
            index === 0 ? "190-0014" : "152-8902",
            index === 0 ? "東京都立川市緑町3256" : "東京都目黒区東が丘2-5-1",
            index === 0 ? "042-526-5511" : "03-3411-0111",
            index + 50,
          ],
        );
        const hospitalId = hospitalRes.rows[0]?.id;
        if (!hospitalId) throw new Error(`Failed to seed MCI50 hospital ${definition.name}.`);

        await client.query(
          `
            INSERT INTO users (username, password_hash, role, display_name, team_id, hospital_id, is_active, updated_at)
            VALUES ($1, $2, 'HOSPITAL', $3, NULL, $4, TRUE, NOW())
          `,
          [definition.username, passwordHash, `${definition.name} E2E`, hospitalId],
        );

        hospitals.push({
          dbId: hospitalId,
          name: definition.name,
          sourceNo: definition.sourceNo,
          username: definition.username,
          password: MCI50_PASSWORD,
          capacities: definition.capacities,
        });
      }

      await client.query("COMMIT");
      return {
        sourceCaseId: `${MCI50_CASE_PREFIX}-CASE-01`,
        address: MCI50_ADDRESS,
        teams,
        hospitals,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    }
  });
}

async function cleanupMci50Scenario() {
  await withMci50Client(async (client) => {
    await client.query("BEGIN");
    try {
      await cleanupMci50Seed(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    }
  });
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

test("dispatch approves an MCI incident and hospitals reply with color capacities", async ({ page }) => {
  test.setTimeout(180_000);
  const dispatchAddress = `新宿区西新宿2-8-1 MCI-${Date.now()}`;

  try {
    await loginAs(page, testUsers.emsA, "/cases/new");
    await setCurrentMode(page, "LIVE");
    await setOperationalMode(page, "TRIAGE");
    await createTriageDispatchReport(page, dispatchAddress, "赤3 黄6 緑20 第一報 A");
    await setOperationalMode(page, "STANDARD");

    await page.context().clearCookies();
    await loginAs(page, testUsers.emsB, "/cases/new");
    await setCurrentMode(page, "LIVE");
    await setOperationalMode(page, "TRIAGE");
    await createTriageDispatchReport(page, dispatchAddress, "赤3 黄6 緑20 第一報 B");
    await setOperationalMode(page, "STANDARD");

    await page.context().clearCookies();
    await loginAs(page, testUsers.dispatch, "/dispatch/cases");

    const dispatchRowsResponse = await page.context().request.get("/api/dispatch/cases");
    expect(dispatchRowsResponse.ok()).toBeTruthy();
    const dispatchRowsData = await readJson<{
      rows?: Array<{ caseId: string; dispatchAddress: string; teamName: string }>;
    }>(dispatchRowsResponse);
    const dispatchCases = (dispatchRowsData.rows ?? []).filter((row) => row.dispatchAddress === dispatchAddress);
    expect(dispatchCases.length).toBeGreaterThanOrEqual(2);
    const commanderSourceCase = dispatchCases.find((row) => row.teamName === testTeams.teamA.name) ?? dispatchCases[0];

    const mciGetResponse = await page.context().request.get(
      `/api/dispatch/cases/${encodeURIComponent(commanderSourceCase.caseId)}/mci-incident`,
    );
    expect(mciGetResponse.ok(), await mciGetResponse.text()).toBeTruthy();
    const mciGetData = await readJson<{
      candidates?: Array<{ teamId: number; teamName: string; isSourceTeam: boolean; operationalMode: string }>;
    }>(mciGetResponse);
    expect(mciGetData.candidates?.length).toBeGreaterThanOrEqual(2);
    const commandTeamId = mciGetData.candidates?.find((team) => team.isSourceTeam)?.teamId ?? mciGetData.candidates![0].teamId;
    const selectedTeamIds = mciGetData.candidates!.map((team) => team.teamId);
    const transportTeamId = mciGetData.candidates!.find((team) => team.teamName === testTeams.teamB.name)?.teamId
      ?? mciGetData.candidates!.find((team) => team.teamId !== commandTeamId)?.teamId
      ?? commandTeamId;

    const approveResponse = await page.context().request.post(
      `/api/dispatch/cases/${encodeURIComponent(commanderSourceCase.caseId)}/mci-incident`,
      {
        data: {
          summary: "多数傷病者。色別人数を基に病院枠を確保する。",
          notes: "現場統括救急隊へ搬送枠を集約する。",
          startCounts: { red: 3, yellow: 6, green: 20, black: 0 },
          patCounts: { red: 2, yellow: 7, green: 20, black: 0 },
          commandTeamId,
          selectedTeamIds,
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(approveResponse.ok(), await approveResponse.text()).toBeTruthy();
    const approveData = await readJson<{
      incident?: { id: number; incidentCode: string; teams: Array<{ teamId: number; role: string; operationalModeAtRequest: string }> };
    }>(approveResponse);
    expect(approveData.incident?.incidentCode).toMatch(/^MCI-/);
    expect(approveData.incident?.teams.find((team) => team.teamId === commandTeamId)?.role).toBe("COMMANDER");
    expect(approveData.incident?.teams.length).toBeGreaterThanOrEqual(2);

    const modeRequestResponse = await page.context().request.post(
      `/api/dispatch/mci-incidents/${approveData.incident!.id}/triage-mode-requests`,
      {
        data: {},
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(modeRequestResponse.ok(), await modeRequestResponse.text()).toBeTruthy();
    const modeRequestData = await readJson<{ notifiedTeamIds?: number[] }>(modeRequestResponse);
    expect(modeRequestData.notifiedTeamIds?.length).toBeGreaterThanOrEqual(1);

    const mciHospitalRequestResponse = await page.context().request.post(
      `/api/dispatch/mci-incidents/${approveData.incident!.id}/hospital-requests`,
      {
        data: {
          hospitals: [{ hospitalId: 990001, hospitalName: testHospitals.hospitalA }],
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(mciHospitalRequestResponse.ok(), await mciHospitalRequestResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
    const hospitalMciRowsResponse = await page.context().request.get("/api/hospitals/mci-requests");
    expect(hospitalMciRowsResponse.ok(), await hospitalMciRowsResponse.text()).toBeTruthy();
    const hospitalMciRowsData = await readJson<{
      rows?: Array<{ id: number; incidentCode: string; status: string }>;
    }>(hospitalMciRowsResponse);
    const hospitalMciRequest = (hospitalMciRowsData.rows ?? []).find(
      (row) => row.incidentCode === approveData.incident!.incidentCode,
    );
    expect(hospitalMciRequest).toBeTruthy();

    const hospitalMciOfferResponse = await page.context().request.patch(`/api/hospitals/mci-requests/${hospitalMciRequest!.id}`, {
      data: {
        status: "ACCEPTABLE",
        capacities: { red: 1, yellow: 2, green: 5, black: 0 },
        notes: "MCI枠として受入可能",
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(hospitalMciOfferResponse.ok(), await hospitalMciOfferResponse.text()).toBeTruthy();
    const hospitalMciOfferData = await readJson<{
      row?: { status: string; offer?: { id: number; red: number; yellow: number; green: number } | null };
    }>(hospitalMciOfferResponse);
    expect(hospitalMciOfferData.row?.status).toBe("ACCEPTABLE");
    expect(hospitalMciOfferData.row?.offer?.red).toBe(1);
    expect(hospitalMciOfferData.row?.offer?.yellow).toBe(2);
    expect(hospitalMciOfferData.row?.offer?.green).toBe(5);

    await page.context().clearCookies();
    await loginAs(page, testUsers.emsA, "/paramedics");
    const createdPatients: Array<{ id: number; patientNo: string; injuryDetails: string }> = [];
    for (let index = 0; index < 5; index += 1) {
      const injuryDetails = `歩行可能、軽症擦過傷 ${index + 1}`;
      const patientResponse = await page.context().request.post(
        `/api/ems/mci-incidents/${approveData.incident!.id}/patients`,
        {
          data: {
            currentTag: "GREEN",
            startTag: "GREEN",
            patTag: "GREEN",
            injuryDetails,
          },
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(patientResponse.ok(), await patientResponse.text()).toBeTruthy();
      const patientData = await readJson<{ patient?: { id: number; patientNo: string } }>(patientResponse);
      expect(patientData.patient?.patientNo).toMatch(/^P-\d{3}$/);
      createdPatients.push({
        id: patientData.patient!.id,
        patientNo: patientData.patient!.patientNo,
        injuryDetails,
      });
    }

    const selfAssignmentResponse = await page.context().request.post(
      `/api/ems/mci-incidents/${approveData.incident!.id}/transport-assignments`,
      {
        data: {
          targetTeamId: commandTeamId,
          hospitalOfferId: hospitalMciOfferData.row!.offer!.id,
          patientIds: createdPatients.slice(0, 2).map((patient) => patient.id),
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(selfAssignmentResponse.ok(), await selfAssignmentResponse.text()).toBeTruthy();
    const selfAssignmentData = await readJson<{
      assignment?: { id: number; status: string; patients: Array<{ patientNo: string }> };
    }>(selfAssignmentResponse);
    expect(selfAssignmentData.assignment?.status).toBe("SENT_TO_TEAM");
    expect(selfAssignmentData.assignment?.patients.map((patient) => patient.patientNo)).toEqual(
      createdPatients.slice(0, 2).map((patient) => patient.patientNo),
    );

    const remoteAssignmentResponse = await page.context().request.post(
      `/api/ems/mci-incidents/${approveData.incident!.id}/transport-assignments`,
      {
        data: {
          targetTeamId: transportTeamId,
          hospitalOfferId: hospitalMciOfferData.row!.offer!.id,
          patientIds: createdPatients.slice(2).map((patient) => patient.id),
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(remoteAssignmentResponse.ok(), await remoteAssignmentResponse.text()).toBeTruthy();
    const remoteAssignmentData = await readJson<{
      assignment?: { id: number; status: string; patients: Array<{ patientNo: string }> };
    }>(remoteAssignmentResponse);
    expect(remoteAssignmentData.assignment?.status).toBe("SENT_TO_TEAM");
    expect(remoteAssignmentData.assignment?.patients.map((patient) => patient.patientNo)).toEqual(
      createdPatients.slice(2).map((patient) => patient.patientNo),
    );

    const selfDecisionResponse = await page.context().request.patch(
      `/api/ems/mci-transport-assignments/${selfAssignmentData.assignment!.id}/decision`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(selfDecisionResponse.ok(), await selfDecisionResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.emsB, "/paramedics");
    const remoteDecisionResponse = await page.context().request.patch(
      `/api/ems/mci-transport-assignments/${remoteAssignmentData.assignment!.id}/decision`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(remoteDecisionResponse.ok(), await remoteDecisionResponse.text()).toBeTruthy();

    await page.context().clearCookies();
    await loginAs(page, testUsers.hospitalA, "/hospitals/requests");
    const hospitalTransportsResponse = await page.context().request.get("/api/hospitals/mci-transport-assignments");
    expect(hospitalTransportsResponse.ok(), await hospitalTransportsResponse.text()).toBeTruthy();
    const hospitalTransportsData = await readJson<{
      rows?: Array<{
        incidentCode: string;
        status: string;
        patients: Array<{ patientNo: string; injuryDetails: string }>;
      }>;
    }>(hospitalTransportsResponse);
    const decidedRows = (hospitalTransportsData.rows ?? []).filter(
      (row) => row.incidentCode === approveData.incident!.incidentCode && row.status === "TRANSPORT_DECIDED",
    );
    const decidedPatients = new Map(
      decidedRows.flatMap((row) => row.patients.map((patient) => [patient.patientNo, patient.injuryDetails] as const)),
    );
    for (const patient of createdPatients) {
      expect(decidedPatients.get(patient.patientNo)).toBe(patient.injuryDetails);
    }
    expect(decidedPatients.size).toBe(createdPatients.length);
  } finally {
    await page.context().clearCookies().catch(() => undefined);
  }
});

test("MCI load test assigns 50 patients from 11 EMS teams to 災害医療センター and 東京医療センター", async ({ page }, testInfo) => {
  test.setTimeout(420_000);

  try {
    const seed = await seedMci50Scenario();

    await loginAs(page, testUsers.dispatch, "/dispatch/cases");
    await setCurrentMode(page, "LIVE");

    const mciGetResponse = await page.context().request.get(
      `/api/dispatch/cases/${encodeURIComponent(seed.sourceCaseId)}/mci-incident`,
    );
    expect(mciGetResponse.ok(), await mciGetResponse.text()).toBeTruthy();
    const mciGetData = await readJson<{
      candidates?: Array<{ teamId: number; teamName: string; isSourceTeam: boolean; operationalMode: string }>;
    }>(mciGetResponse);
    expect(mciGetData.candidates?.length).toBe(seed.teams.length);
    expect(mciGetData.candidates?.map((team) => team.teamName)).toContain("本部機動第一");
    const commandTeamId =
      mciGetData.candidates?.find((team) => team.teamName === "本部機動第一")?.teamId ??
      mciGetData.candidates?.find((team) => team.isSourceTeam)?.teamId ??
      seed.teams[0].id;
    const selectedTeamIds = mciGetData.candidates!.map((team) => team.teamId);

    const approveResponse = await page.context().request.post(
      `/api/dispatch/cases/${encodeURIComponent(seed.sourceCaseId)}/mci-incident`,
      {
        data: {
          summary: "大規模災害用50名搬送テスト。赤10、黄15、緑25を2病院へ割り振る。",
          notes: "本部機動第一を統括救急隊として、参加11隊へ搬送割当を展開する。",
          startCounts: { red: 10, yellow: 15, green: 25, black: 0 },
          patCounts: { red: 10, yellow: 15, green: 25, black: 0 },
          commandTeamId,
          selectedTeamIds,
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(approveResponse.ok(), await approveResponse.text()).toBeTruthy();
    const approveData = await readJson<{
      incident?: {
        id: number;
        incidentCode: string;
        teams: Array<{ teamId: number; role: string }>;
      };
    }>(approveResponse);
    const incident = approveData.incident;
    expect(incident?.incidentCode).toMatch(/^MCI-/);
    expect(incident?.teams.length).toBe(seed.teams.length);
    expect(incident?.teams.find((team) => team.teamId === commandTeamId)?.role).toBe("COMMANDER");

    const mciHospitalRequestResponse = await page.context().request.post(
      `/api/dispatch/mci-incidents/${incident!.id}/hospital-requests`,
      {
        data: {
          hospitals: seed.hospitals.map((hospital) => ({
            hospitalId: hospital.sourceNo,
            hospitalName: hospital.name,
          })),
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(mciHospitalRequestResponse.ok(), await mciHospitalRequestResponse.text()).toBeTruthy();

    const offerIdsByHospital = new Map<number, number>();
    for (const hospital of seed.hospitals) {
      await page.context().clearCookies();
      await loginAs(page, { username: hospital.username, password: hospital.password }, "/hospitals/requests");
      await setCurrentMode(page, "LIVE");

      const requestsResponse = await page.context().request.get("/api/hospitals/mci-requests");
      expect(requestsResponse.ok(), await requestsResponse.text()).toBeTruthy();
      const requestsData = await readJson<{
        rows?: Array<{ id: number; incidentCode: string; hospitalName: string; status: string }>;
      }>(requestsResponse);
      const request = (requestsData.rows ?? []).find(
        (row) => row.incidentCode === incident!.incidentCode && row.hospitalName === hospital.name,
      );
      expect(request).toBeTruthy();

      const offerResponse = await page.context().request.patch(`/api/hospitals/mci-requests/${request!.id}`, {
        data: {
          status: "ACCEPTABLE",
          capacities: hospital.capacities,
          notes: `${hospital.name} MCI50テスト受入可能`,
        },
        headers: { "Content-Type": "application/json" },
      });
      expect(offerResponse.ok(), await offerResponse.text()).toBeTruthy();
      const offerData = await readJson<{
        row?: { status: string; offer?: { id: number; red: number; yellow: number; green: number; black: number } | null };
      }>(offerResponse);
      expect(offerData.row?.status).toBe("ACCEPTABLE");
      expect(offerData.row?.offer).toMatchObject(hospital.capacities);
      offerIdsByHospital.set(hospital.sourceNo, offerData.row!.offer!.id);
    }

    await page.context().clearCookies();
    await loginAs(page, { username: seed.teams[0].username, password: seed.teams[0].password }, "/paramedics");
    await setCurrentMode(page, "LIVE");

    const patientSpecs: Array<{ tag: TriageTag; hospitalIndex: 0 | 1; injuryDetails: string }> = [
      ...Array.from({ length: 5 }, (_, index) => ({
        tag: "RED" as const,
        hospitalIndex: 0 as const,
        injuryDetails: `MCI50-${String(index + 1).padStart(2, "0")} 赤 START/PAT重症 外傷詳細`,
      })),
      ...Array.from({ length: 8 }, (_, index) => ({
        tag: "YELLOW" as const,
        hospitalIndex: 0 as const,
        injuryDetails: `MCI50-${String(index + 6).padStart(2, "0")} 黄 START/PAT中等症 外傷詳細`,
      })),
      ...Array.from({ length: 12 }, (_, index) => ({
        tag: "GREEN" as const,
        hospitalIndex: 0 as const,
        injuryDetails: `MCI50-${String(index + 14).padStart(2, "0")} 緑 START/PAT軽症 外傷詳細`,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        tag: "RED" as const,
        hospitalIndex: 1 as const,
        injuryDetails: `MCI50-${String(index + 26).padStart(2, "0")} 赤 START/PAT重症 外傷詳細`,
      })),
      ...Array.from({ length: 7 }, (_, index) => ({
        tag: "YELLOW" as const,
        hospitalIndex: 1 as const,
        injuryDetails: `MCI50-${String(index + 31).padStart(2, "0")} 黄 START/PAT中等症 外傷詳細`,
      })),
      ...Array.from({ length: 13 }, (_, index) => ({
        tag: "GREEN" as const,
        hospitalIndex: 1 as const,
        injuryDetails: `MCI50-${String(index + 38).padStart(2, "0")} 緑 START/PAT軽症 外傷詳細`,
      })),
    ];
    expect(patientSpecs).toHaveLength(50);

    const patientsByHospital: Array<Array<{ id: number; patientNo: string; injuryDetails: string }>> = [[], []];
    const createdPatientNos = new Set<string>();
    for (const spec of patientSpecs) {
      const patientResponse = await page.context().request.post(`/api/ems/mci-incidents/${incident!.id}/patients`, {
        data: {
          currentTag: spec.tag,
          startTag: spec.tag,
          patTag: spec.tag,
          injuryDetails: spec.injuryDetails,
        },
        headers: { "Content-Type": "application/json" },
      });
      expect(patientResponse.ok(), await patientResponse.text()).toBeTruthy();
      const patientData = await readJson<{ patient?: { id: number; patientNo: string } }>(patientResponse);
      expect(patientData.patient?.patientNo).toMatch(/^P-\d{3}$/);
      createdPatientNos.add(patientData.patient!.patientNo);
      patientsByHospital[spec.hospitalIndex].push({
        id: patientData.patient!.id,
        patientNo: patientData.patient!.patientNo,
        injuryDetails: spec.injuryDetails,
      });
    }
    expect(createdPatientNos.size).toBe(50);

    const assignmentPlan = [
      ...Array.from({ length: 5 }, (_, index) => ({ teamIndex: index, hospitalIndex: 0 as const, patientCount: 5 })),
      { teamIndex: 5, hospitalIndex: 1 as const, patientCount: 5 },
      ...Array.from({ length: 5 }, (_, index) => ({ teamIndex: index + 6, hospitalIndex: 1 as const, patientCount: 4 })),
    ];
    expect(assignmentPlan).toHaveLength(seed.teams.length);

    const patientQueues = patientsByHospital.map((patients) => [...patients]);
    const assignments: Array<{ id: number; team: Mci50TeamSeed; hospitalName: string; patientCount: number }> = [];
    for (const plan of assignmentPlan) {
      const team = seed.teams[plan.teamIndex];
      const hospital = seed.hospitals[plan.hospitalIndex];
      const offerId = offerIdsByHospital.get(hospital.sourceNo);
      expect(offerId).toBeTruthy();
      const patients = patientQueues[plan.hospitalIndex].splice(0, plan.patientCount);
      expect(patients).toHaveLength(plan.patientCount);

      const assignmentResponse = await page.context().request.post(
        `/api/ems/mci-incidents/${incident!.id}/transport-assignments`,
        {
          data: {
            targetTeamId: team.id,
            hospitalOfferId: offerId,
            patientIds: patients.map((patient) => patient.id),
          },
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(assignmentResponse.ok(), await assignmentResponse.text()).toBeTruthy();
      const assignmentData = await readJson<{
        assignment?: { id: number; status: string; teamName: string; hospitalName: string; patients: Array<{ patientNo: string }> };
      }>(assignmentResponse);
      expect(assignmentData.assignment?.status).toBe("SENT_TO_TEAM");
      expect(assignmentData.assignment?.teamName).toBe(team.name);
      expect(assignmentData.assignment?.hospitalName).toBe(hospital.name);
      expect(assignmentData.assignment?.patients).toHaveLength(plan.patientCount);
      assignments.push({
        id: assignmentData.assignment!.id,
        team,
        hospitalName: hospital.name,
        patientCount: plan.patientCount,
      });
    }
    expect(patientQueues[0]).toHaveLength(0);
    expect(patientQueues[1]).toHaveLength(0);

    for (const assignment of assignments) {
      await page.context().clearCookies();
      await loginAs(page, { username: assignment.team.username, password: assignment.team.password }, "/paramedics");
      await setCurrentMode(page, "LIVE");

      const decisionResponse = await page.context().request.patch(
        `/api/ems/mci-transport-assignments/${assignment.id}/decision`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(decisionResponse.ok(), await decisionResponse.text()).toBeTruthy();
      const decisionData = await readJson<{ assignment?: { status: string; patientCount: number; hospitalName: string } }>(
        decisionResponse,
      );
      expect(decisionData.assignment?.status).toBe("TRANSPORT_DECIDED");
      expect(decisionData.assignment?.patientCount).toBe(assignment.patientCount);
      expect(decisionData.assignment?.hospitalName).toBe(assignment.hospitalName);
    }

    const decidedPatients = new Map<string, string>();
    for (const hospital of seed.hospitals) {
      await page.context().clearCookies();
      await loginAs(page, { username: hospital.username, password: hospital.password }, "/hospitals/requests");
      await setCurrentMode(page, "LIVE");

      const transportsResponse = await page.context().request.get("/api/hospitals/mci-transport-assignments");
      expect(transportsResponse.ok(), await transportsResponse.text()).toBeTruthy();
      const transportsData = await readJson<{
        rows?: Array<{
          incidentCode: string;
          hospitalName: string;
          status: string;
          patients: Array<{ patientNo: string; injuryDetails: string }>;
        }>;
      }>(transportsResponse);
      const hospitalRows = (transportsData.rows ?? []).filter(
        (row) =>
          row.incidentCode === incident!.incidentCode &&
          row.hospitalName === hospital.name &&
          row.status === "TRANSPORT_DECIDED",
      );
      const hospitalPatientCount = hospitalRows.reduce((sum, row) => sum + row.patients.length, 0);
      expect(hospitalPatientCount).toBe(25);
      for (const row of hospitalRows) {
        for (const patient of row.patients) {
          decidedPatients.set(patient.patientNo, patient.injuryDetails);
        }
      }
    }

    expect(decidedPatients.size).toBe(50);
    expect(decidedPatients.has("P-001")).toBeTruthy();
    expect(decidedPatients.has("P-050")).toBeTruthy();
    for (const patients of patientsByHospital) {
      for (const patient of patients) {
        expect(decidedPatients.get(patient.patientNo)).toBe(patient.injuryDetails);
      }
    }
  } finally {
    await page.context().clearCookies().catch(() => undefined);
    await cleanupMci50Scenario().catch((error) => {
      if (!testInfo.error) throw error;
      console.warn("MCI50 cleanup failed after test failure.", error);
    });
  }
});
