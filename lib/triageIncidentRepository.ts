import type { AppMode } from "@/lib/appMode";
import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { ensureTriageIncidentTables } from "@/lib/triageIncidentSchema";

export type TriageColorCounts = {
  red: number;
  yellow: number;
  green: number;
  black: number;
};

export type MciIncidentCandidateTeam = {
  teamId: number;
  teamName: string;
  teamCode: string;
  caseId: string | null;
  caseUid: string | null;
  isSourceTeam: boolean;
  operationalMode: "STANDARD" | "TRIAGE";
};

export type MciIncidentTeam = {
  id: number;
  teamId: number;
  teamName: string;
  teamCode: string;
  role: "CREATOR" | "COMMAND_CANDIDATE" | "COMMANDER" | "TRANSPORT";
  participationStatus: "REQUESTED" | "JOINED" | "ARRIVED" | "AVAILABLE" | "ASSIGNED" | "LEFT";
  operationalModeAtRequest: "STANDARD" | "TRIAGE";
  triageModeRequestedAt: string | null;
};

export type MciIncidentSummary = {
  id: number;
  incidentCode: string;
  sourceCaseUid: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "CLOSED";
  address: string;
  awareDate: string | null;
  summary: string;
  notes: string;
  commandTeamId: number | null;
  startCounts: TriageColorCounts;
  patCounts: TriageColorCounts;
  approvedAt: string | null;
  teams: MciIncidentTeam[];
};

export type MciHospitalRequestListItem = {
  id: number;
  requestId: string;
  incidentId: number;
  incidentCode: string;
  hospitalId: number;
  hospitalName: string;
  status: "UNREAD" | "READ" | "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE";
  disasterSummary: string;
  startCounts: TriageColorCounts;
  patCounts: TriageColorCounts;
  notes: string;
  sentAt: string;
  offer: {
    id: number;
    red: number;
    yellow: number;
    green: number;
    black: number;
    notes: string;
    respondedAt: string;
  } | null;
};

export type MciPatientItem = {
  id: number;
  patientNo: string;
  registrationStatus: "DRAFT" | "PENDING_COMMAND_REVIEW" | "CONFIRMED" | "MERGED" | "CANCELLED";
  currentTag: "RED" | "YELLOW" | "GREEN" | "BLACK";
  startTag: "RED" | "YELLOW" | "GREEN" | "BLACK" | null;
  patTag: "RED" | "YELLOW" | "GREEN" | "BLACK" | null;
  injuryDetails: string;
  assignedTeamId: number | null;
  assignedHospitalId: number | null;
  transportAssignmentId: number | null;
};

export type MciTransportAssignmentItem = {
  id: number;
  incidentId: number;
  incidentCode: string;
  hospitalOfferId: number | null;
  hospitalId: number;
  hospitalName: string;
  teamId: number;
  teamName: string;
  teamCode: string;
  status: "DRAFT" | "SENT_TO_TEAM" | "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | "ARRIVED";
  patientCount: number;
  patients: MciPatientItem[];
  sentAt: string | null;
  decidedAt: string | null;
};

type SourceCaseRow = {
  case_id: string;
  case_uid: string;
  team_id: number | null;
  mode: AppMode;
  address: string | null;
  aware_date: string | null;
  case_payload: unknown;
};

type CandidateRow = {
  team_id: number;
  team_name: string;
  team_code: string;
  case_id: string | null;
  case_uid: string | null;
  is_source_team: boolean;
  operational_mode: "STANDARD" | "TRIAGE" | null;
};

type IncidentRow = {
  id: number;
  incident_code: string | null;
  source_case_uid: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "CLOSED";
  address: string;
  aware_date: string | null;
  summary: string;
  notes: string;
  command_team_id: number | null;
  start_red_count: number;
  start_yellow_count: number;
  start_green_count: number;
  start_black_count: number;
  pat_red_count: number;
  pat_yellow_count: number;
  pat_green_count: number;
  pat_black_count: number;
  approved_at: string | null;
};

type TeamRow = {
  id: number;
  team_id: number;
  team_name: string;
  team_code: string;
  role: MciIncidentTeam["role"];
  participation_status: MciIncidentTeam["participationStatus"];
  operational_mode_at_request: MciIncidentTeam["operationalModeAtRequest"];
  triage_mode_requested_at: string | null;
};

type ApproveMciIncidentInput = {
  caseId: string;
  mode: AppMode;
  actor: AuthenticatedUser;
  summary: string;
  notes: string;
  startCounts: TriageColorCounts;
  patCounts: TriageColorCounts;
  commandTeamId: number;
  selectedTeamIds: number[];
};

type HospitalInput = {
  hospitalId?: unknown;
  hospitalName?: unknown;
};

type HospitalResolveRow = {
  id: number;
  source_no: number;
  name: string;
};

type MciHospitalRequestRow = {
  id: number;
  request_id: string;
  incident_id: number;
  incident_code: string | null;
  hospital_id: number;
  hospital_name: string;
  status: MciHospitalRequestListItem["status"];
  disaster_summary: string;
  start_counts: TriageColorCounts | null;
  pat_counts: TriageColorCounts | null;
  notes: string;
  sent_at: string;
  red_capacity: number | null;
  offer_id: number | null;
  yellow_capacity: number | null;
  green_capacity: number | null;
  black_capacity: number | null;
  offer_notes: string | null;
  responded_at: string | null;
};

type PatientRow = {
  id: number;
  patient_no: string;
  registration_status: MciPatientItem["registrationStatus"];
  current_tag: MciPatientItem["currentTag"];
  start_tag: MciPatientItem["startTag"];
  pat_tag: MciPatientItem["patTag"];
  injury_details: string;
  assigned_team_id: number | null;
  assigned_hospital_id: number | null;
  transport_assignment_id: number | null;
};

type AssignmentRow = {
  id: number;
  incident_id: number;
  incident_code: string | null;
  hospital_offer_id: number | null;
  hospital_id: number;
  hospital_name: string;
  team_id: number;
  team_name: string;
  team_code: string;
  status: MciTransportAssignmentItem["status"];
  sent_at: string | null;
  decided_at: string | null;
};

type IncidentAccessRow = {
  id: number;
  incident_code: string | null;
  mode: AppMode;
  status: MciIncidentSummary["status"];
  command_team_id: number | null;
  team_role: MciIncidentTeam["role"] | null;
};

type OfferCapacityRow = {
  id: number;
  incident_id: number;
  hospital_id: number;
  hospital_name: string;
  red_capacity: number;
  yellow_capacity: number;
  green_capacity: number;
  black_capacity: number;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isTriageDispatchReport(casePayload: unknown): boolean {
  const payload = asObject(casePayload);
  const summary = asObject(payload.summary);
  return summary.triageDispatchReport === true || summary.triageWorkflow === "DISPATCH_COORDINATED";
}

function normalizeComparableText(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

function normalizeDateKey(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function clampCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(9999, Math.trunc(value)));
}

function normalizeCounts(counts: TriageColorCounts): TriageColorCounts {
  return {
    red: clampCount(counts.red),
    yellow: clampCount(counts.yellow),
    green: clampCount(counts.green),
    black: clampCount(counts.black),
  };
}

function toIncident(row: IncidentRow, teams: MciIncidentTeam[]): MciIncidentSummary {
  return {
    id: row.id,
    incidentCode: row.incident_code ?? `MCI-${row.id}`,
    sourceCaseUid: row.source_case_uid,
    status: row.status,
    address: row.address,
    awareDate: row.aware_date,
    summary: row.summary,
    notes: row.notes,
    commandTeamId: row.command_team_id,
    startCounts: {
      red: row.start_red_count,
      yellow: row.start_yellow_count,
      green: row.start_green_count,
      black: row.start_black_count,
    },
    patCounts: {
      red: row.pat_red_count,
      yellow: row.pat_yellow_count,
      green: row.pat_green_count,
      black: row.pat_black_count,
    },
    approvedAt: row.approved_at,
    teams,
  };
}

function toTeam(row: TeamRow): MciIncidentTeam {
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name,
    teamCode: row.team_code,
    role: row.role,
    participationStatus: row.participation_status,
    operationalModeAtRequest: row.operational_mode_at_request,
    triageModeRequestedAt: row.triage_mode_requested_at,
  };
}

function toHospitalRequest(row: MciHospitalRequestRow): MciHospitalRequestListItem {
  return {
    id: row.id,
    requestId: row.request_id,
    incidentId: row.incident_id,
    incidentCode: row.incident_code ?? `MCI-${row.incident_id}`,
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name,
    status: row.status,
    disasterSummary: row.disaster_summary,
    startCounts: normalizeCounts(row.start_counts ?? initialTriageColorCounts()),
    patCounts: normalizeCounts(row.pat_counts ?? initialTriageColorCounts()),
    notes: row.notes,
    sentAt: row.sent_at,
    offer:
      row.responded_at == null
        ? null
        : {
            id: row.offer_id ?? 0,
            red: row.red_capacity ?? 0,
            yellow: row.yellow_capacity ?? 0,
            green: row.green_capacity ?? 0,
            black: row.black_capacity ?? 0,
            notes: row.offer_notes ?? "",
            respondedAt: row.responded_at,
          },
  };
}

function initialTriageColorCounts(): TriageColorCounts {
  return { red: 0, yellow: 0, green: 0, black: 0 };
}

function isTriageTag(value: unknown): value is MciPatientItem["currentTag"] {
  return value === "RED" || value === "YELLOW" || value === "GREEN" || value === "BLACK";
}

function toPatient(row: PatientRow): MciPatientItem {
  return {
    id: row.id,
    patientNo: row.patient_no,
    registrationStatus: row.registration_status,
    currentTag: row.current_tag,
    startTag: row.start_tag,
    patTag: row.pat_tag,
    injuryDetails: row.injury_details,
    assignedTeamId: row.assigned_team_id,
    assignedHospitalId: row.assigned_hospital_id,
    transportAssignmentId: row.transport_assignment_id,
  };
}

function toTransportAssignment(row: AssignmentRow, patients: MciPatientItem[]): MciTransportAssignmentItem {
  return {
    id: row.id,
    incidentId: row.incident_id,
    incidentCode: row.incident_code ?? `MCI-${row.incident_id}`,
    hospitalOfferId: row.hospital_offer_id,
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name,
    teamId: row.team_id,
    teamName: row.team_name,
    teamCode: row.team_code,
    status: row.status,
    patientCount: patients.length,
    patients,
    sentAt: row.sent_at,
    decidedAt: row.decided_at,
  };
}

async function getSourceCase(caseId: string, mode: AppMode): Promise<SourceCaseRow | null> {
  const res = await db.query<SourceCaseRow>(
    `
      SELECT case_id, case_uid, team_id, mode, address, aware_date::text AS aware_date, case_payload
      FROM cases
      WHERE (case_id = $1 OR case_uid = $1)
        AND mode = $2
      LIMIT 1
    `,
    [caseId, mode],
  );
  return res.rows[0] ?? null;
}

async function getIncidentTeams(incidentId: number): Promise<MciIncidentTeam[]> {
  const res = await db.query<TeamRow>(
    `
      SELECT
        it.id,
        it.team_id,
        et.team_name,
        et.team_code,
        it.role,
        it.participation_status,
        it.operational_mode_at_request,
        it.triage_mode_requested_at::text AS triage_mode_requested_at
      FROM triage_incident_teams it
      JOIN emergency_teams et ON et.id = it.team_id
      WHERE it.incident_id = $1
      ORDER BY
        CASE it.role
          WHEN 'COMMANDER' THEN 0
          WHEN 'CREATOR' THEN 1
          WHEN 'COMMAND_CANDIDATE' THEN 2
          ELSE 3
        END,
        et.display_order ASC,
        et.team_name ASC
    `,
    [incidentId],
  );
  return res.rows.map(toTeam);
}

export async function listMciIncidentCandidatesForCase(caseId: string, mode: AppMode): Promise<MciIncidentCandidateTeam[]> {
  await ensureTriageIncidentTables();

  const source = await getSourceCase(caseId, mode);
  if (!source || !isTriageDispatchReport(source.case_payload)) return [];

  const addressKey = normalizeComparableText(source.address);
  const dateKey = normalizeDateKey(source.aware_date);
  if (!addressKey || !dateKey) {
    return [];
  }

  const res = await db.query<CandidateRow>(
    `
      WITH incident_cases AS (
        SELECT DISTINCT ON (c.team_id)
          c.team_id,
          c.case_id,
          c.case_uid,
          c.case_uid = $1 AS is_source_team,
          c.created_at
        FROM cases c
        WHERE c.team_id IS NOT NULL
          AND c.mode = $2
          AND c.case_payload->'summary'->>'triageDispatchReport' = 'true'
          AND regexp_replace(COALESCE(c.address, ''), '\\s+', '', 'g') = $3
          AND COALESCE(c.aware_date::text, '') = $4
        ORDER BY c.team_id, c.case_uid = $1 DESC, c.created_at ASC
      )
      SELECT
        et.id AS team_id,
        et.team_name,
        et.team_code,
        ic.case_id,
        ic.case_uid,
        COALESCE(ic.is_source_team, FALSE) AS is_source_team,
        COALESCE(mode_state.operational_mode, 'STANDARD') AS operational_mode
      FROM emergency_teams et
      JOIN incident_cases ic ON ic.team_id = et.id
      LEFT JOIN LATERAL (
        SELECT eus.operational_mode
        FROM users u
        LEFT JOIN ems_user_settings eus ON eus.user_id = u.id
        WHERE u.team_id = et.id
          AND u.role = 'EMS'
          AND u.is_active = TRUE
        ORDER BY CASE WHEN eus.operational_mode = 'TRIAGE' THEN 0 ELSE 1 END, u.id ASC
        LIMIT 1
      ) mode_state ON TRUE
      WHERE et.is_active = TRUE
      ORDER BY ic.is_source_team DESC, et.display_order ASC, et.team_name ASC
    `,
    [source.case_uid, mode, addressKey, dateKey],
  );

  return res.rows.map((row) => ({
    teamId: row.team_id,
    teamName: row.team_name,
    teamCode: row.team_code,
    caseId: row.case_id,
    caseUid: row.case_uid,
    isSourceTeam: row.is_source_team,
    operationalMode: row.operational_mode ?? "STANDARD",
  }));
}

export async function getMciIncidentBySourceCase(caseId: string, mode: AppMode): Promise<MciIncidentSummary | null> {
  await ensureTriageIncidentTables();
  const source = await getSourceCase(caseId, mode);
  if (!source) return null;

  const res = await db.query<IncidentRow>(
    `
      SELECT
        id,
        incident_code,
        source_case_uid,
        status,
        address,
        aware_date::text AS aware_date,
        summary,
        notes,
        command_team_id,
        start_red_count,
        start_yellow_count,
        start_green_count,
        start_black_count,
        pat_red_count,
        pat_yellow_count,
        pat_green_count,
        pat_black_count,
        approved_at::text AS approved_at
      FROM triage_incidents
      WHERE source_case_uid = $1
        AND mode = $2
      LIMIT 1
    `,
    [source.case_uid, mode],
  );
  const row = res.rows[0];
  if (!row) return null;
  return toIncident(row, await getIncidentTeams(row.id));
}

export async function approveMciIncidentFromCase(input: ApproveMciIncidentInput): Promise<MciIncidentSummary> {
  await ensureTriageIncidentTables();

  const source = await getSourceCase(input.caseId, input.mode);
  if (!source) {
    throw new Error("対象事案が見つかりません。");
  }
  if (!isTriageDispatchReport(source.case_payload)) {
    throw new Error("TRIAGE本部報告以外はインシデント化できません。");
  }
  if (!source.team_id) {
    throw new Error("第一報の隊情報が未設定です。");
  }

  const candidates = await listMciIncidentCandidatesForCase(input.caseId, input.mode);
  const candidateByTeamId = new Map(candidates.map((candidate) => [candidate.teamId, candidate]));
  if (!candidateByTeamId.has(input.commandTeamId)) {
    throw new Error("統括救急隊は同一災害の出場隊から選択してください。");
  }

  const selectedTeamIds = Array.from(new Set([source.team_id, input.commandTeamId, ...input.selectedTeamIds]))
    .filter((teamId) => candidateByTeamId.has(teamId))
    .slice(0, 80);
  if (selectedTeamIds.length === 0) {
    throw new Error("参加依頼を送る隊を選択してください。");
  }

  const startCounts = normalizeCounts(input.startCounts);
  const patCounts = normalizeCounts(input.patCounts);
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`mci-incident:${source.case_uid}`]);

    const incidentRes = await client.query<IncidentRow>(
      `
        INSERT INTO triage_incidents (
          source_case_uid,
          mode,
          status,
          address,
          aware_date,
          summary,
          notes,
          created_by_team_id,
          approved_by_dispatch_user_id,
          command_team_id,
          start_red_count,
          start_yellow_count,
          start_green_count,
          start_black_count,
          pat_red_count,
          pat_yellow_count,
          pat_green_count,
          pat_black_count,
          approved_at,
          updated_at
        ) VALUES (
          $1, $2, 'ACTIVE', $3, $4::date, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        )
        ON CONFLICT (source_case_uid)
        DO UPDATE SET
          status = 'ACTIVE',
          address = EXCLUDED.address,
          aware_date = EXCLUDED.aware_date,
          summary = EXCLUDED.summary,
          notes = EXCLUDED.notes,
          approved_by_dispatch_user_id = EXCLUDED.approved_by_dispatch_user_id,
          command_team_id = EXCLUDED.command_team_id,
          start_red_count = EXCLUDED.start_red_count,
          start_yellow_count = EXCLUDED.start_yellow_count,
          start_green_count = EXCLUDED.start_green_count,
          start_black_count = EXCLUDED.start_black_count,
          pat_red_count = EXCLUDED.pat_red_count,
          pat_yellow_count = EXCLUDED.pat_yellow_count,
          pat_green_count = EXCLUDED.pat_green_count,
          pat_black_count = EXCLUDED.pat_black_count,
          approved_at = COALESCE(triage_incidents.approved_at, NOW()),
          updated_at = NOW()
        RETURNING
          id,
          incident_code,
          source_case_uid,
          status,
          address,
          aware_date::text AS aware_date,
          summary,
          notes,
          command_team_id,
          start_red_count,
          start_yellow_count,
          start_green_count,
          start_black_count,
          pat_red_count,
          pat_yellow_count,
          pat_green_count,
          pat_black_count,
          approved_at::text AS approved_at
      `,
      [
        source.case_uid,
        input.mode,
        source.address ?? "",
        source.aware_date,
        input.summary.trim(),
        input.notes.trim(),
        source.team_id,
        input.actor.id,
        input.commandTeamId,
        startCounts.red,
        startCounts.yellow,
        startCounts.green,
        startCounts.black,
        patCounts.red,
        patCounts.yellow,
        patCounts.green,
        patCounts.black,
      ],
    );

    let incident = incidentRes.rows[0];
    if (!incident) throw new Error("インシデント作成に失敗しました。");

    if (!incident.incident_code) {
      const dateKey = (source.aware_date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, "");
      const code = `MCI-${dateKey}-${String(incident.id).padStart(4, "0")}`;
      const codeRes = await client.query<IncidentRow>(
        `
          UPDATE triage_incidents
          SET incident_code = $2,
              updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            incident_code,
            source_case_uid,
            status,
            address,
            aware_date::text AS aware_date,
            summary,
            notes,
            command_team_id,
            start_red_count,
            start_yellow_count,
            start_green_count,
            start_black_count,
            pat_red_count,
            pat_yellow_count,
            pat_green_count,
            pat_black_count,
            approved_at::text AS approved_at
        `,
        [incident.id, code],
      );
      incident = codeRes.rows[0] ?? incident;
    }

    for (const teamId of selectedTeamIds) {
      const candidate = candidateByTeamId.get(teamId);
      if (!candidate) continue;
      const role =
        teamId === input.commandTeamId
          ? "COMMANDER"
          : teamId === source.team_id
            ? "CREATOR"
            : "TRANSPORT";

      await client.query(
        `
          INSERT INTO triage_incident_teams (
            incident_id,
            team_id,
            role,
            participation_status,
            operational_mode_at_request,
            updated_at
          ) VALUES ($1, $2, $3, 'REQUESTED', $4, NOW())
          ON CONFLICT (incident_id, team_id)
          DO UPDATE SET
            role = EXCLUDED.role,
            operational_mode_at_request = EXCLUDED.operational_mode_at_request,
            updated_at = NOW()
        `,
        [incident.id, teamId, role, candidate.operationalMode],
      );

      await createNotification(
        {
          audienceRole: "EMS",
          mode: input.mode,
          teamId,
          kind: "mci_incident_invitation",
          caseId: candidate.caseId ?? source.case_id,
          caseUid: candidate.caseUid ?? source.case_uid,
          title: "大規模災害インシデント参加依頼",
          body: `${incident.incident_code ?? "MCI"} / ${source.address ?? "-"}。統括救急隊: ${candidateByTeamId.get(input.commandTeamId)?.teamName ?? "未設定"}`,
          menuKey: "cases-list",
          severity: "warning",
          dedupeKey: `mci-incident-invitation:${incident.id}:${teamId}`,
        },
        client,
      );
    }

    await createNotification(
      {
        audienceRole: "EMS",
        mode: input.mode,
        teamId: input.commandTeamId,
        kind: "mci_commander_designated",
        caseId: source.case_id,
        caseUid: source.case_uid,
        title: "統括救急隊指定",
        body: `${incident.incident_code ?? "MCI"} の統括救急隊に指定されました。現場各隊と患者番号の管理を開始してください。`,
        menuKey: "cases-list",
        severity: "critical",
        dedupeKey: `mci-commander-designated:${incident.id}:${input.commandTeamId}`,
      },
      client,
    );

    await client.query("COMMIT");
    return toIncident(incident, await getIncidentTeams(incident.id));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function requestTriageModeForIncidentTeams(input: {
  incidentId: number;
  mode: AppMode;
  actor: AuthenticatedUser;
  teamIds?: number[];
}): Promise<{ notifiedTeamIds: number[] }> {
  await ensureTriageIncidentTables();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const teamFilter = input.teamIds && input.teamIds.length > 0 ? input.teamIds : null;
    const res = await client.query<{
      team_id: number;
      team_name: string;
      team_code: string;
      incident_code: string | null;
      address: string;
    }>(
      `
        WITH target_teams AS (
          SELECT it.team_id
          FROM triage_incident_teams it
          JOIN triage_incidents i ON i.id = it.incident_id
          WHERE it.incident_id = $1
            AND i.mode = $2
            AND i.status = 'ACTIVE'
            AND it.participation_status <> 'LEFT'
            AND it.operational_mode_at_request <> 'TRIAGE'
            AND ($3::int[] IS NULL OR it.team_id = ANY($3::int[]))
          FOR UPDATE OF it
        )
        UPDATE triage_incident_teams it
        SET triage_mode_requested_at = NOW(),
            updated_at = NOW()
        FROM target_teams tt, triage_incidents i, emergency_teams et
        WHERE it.incident_id = $1
          AND it.team_id = tt.team_id
          AND i.id = it.incident_id
          AND et.id = it.team_id
        RETURNING it.team_id, et.team_name, et.team_code, i.incident_code, i.address
      `,
      [input.incidentId, input.mode, teamFilter],
    );

    for (const row of res.rows) {
      await createNotification(
        {
          audienceRole: "EMS",
          mode: input.mode,
          teamId: row.team_id,
          kind: "mci_triage_mode_switch_request",
          title: "TRIAGEモード切替依頼",
          body: `${row.incident_code ?? "MCI"} / ${row.address || "-"}。大規模災害インシデント対応のためTRIAGEモードへ切り替えてください。`,
          menuKey: "settings-mode",
          severity: "warning",
          dedupeKey: `mci-triage-mode-switch:${input.incidentId}:${row.team_id}`,
        },
        client,
      );
    }

    await client.query("COMMIT");
    return { notifiedTeamIds: res.rows.map((row) => row.team_id) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function resolveHospitals(inputs: HospitalInput[]): Promise<HospitalResolveRow[]> {
  const sourceNos = inputs
    .map((hospital) => Number(hospital.hospitalId))
    .filter((value) => Number.isInteger(value) && value > 0);
  const names = inputs
    .map((hospital) => String(hospital.hospitalName ?? "").trim())
    .filter(Boolean);

  if (sourceNos.length === 0 && names.length === 0) return [];

  const res = await db.query<HospitalResolveRow>(
    `
      SELECT id, source_no, name
      FROM hospitals
      WHERE (array_length($1::int[], 1) IS NOT NULL AND source_no = ANY($1::int[]))
         OR (array_length($1::int[], 1) IS NOT NULL AND id = ANY($1::int[]))
         OR (array_length($2::text[], 1) IS NOT NULL AND name = ANY($2::text[]))
      ORDER BY name ASC
    `,
    [sourceNos.length > 0 ? sourceNos : null, names.length > 0 ? names : null],
  );
  return res.rows;
}

export async function listMciHospitalRequestsForDispatch(
  incidentId: number,
  mode: AppMode,
): Promise<MciHospitalRequestListItem[]> {
  await ensureTriageIncidentTables();
  const res = await db.query<MciHospitalRequestRow>(
    `
      SELECT
        r.id,
        r.request_id,
        r.incident_id,
        i.incident_code,
        r.hospital_id,
        h.name AS hospital_name,
        r.status,
        r.disaster_summary,
        r.start_counts,
        r.pat_counts,
        r.notes,
        r.sent_at::text AS sent_at,
        o.red_capacity,
        o.id AS offer_id,
        o.yellow_capacity,
        o.green_capacity,
        o.black_capacity,
        o.notes AS offer_notes,
        o.responded_at::text AS responded_at
      FROM triage_hospital_requests r
      JOIN triage_incidents i ON i.id = r.incident_id
      JOIN hospitals h ON h.id = r.hospital_id
      LEFT JOIN triage_hospital_offers o ON o.request_id = r.id
      WHERE r.incident_id = $1
        AND i.mode = $2
      ORDER BY
        CASE r.status WHEN 'ACCEPTABLE' THEN 0 WHEN 'NEGOTIATING' THEN 1 WHEN 'UNREAD' THEN 2 ELSE 3 END,
        r.sent_at DESC,
        r.id DESC
    `,
    [incidentId, mode],
  );
  return res.rows.map(toHospitalRequest);
}

export async function sendMciHospitalRequests(input: {
  incidentId: number;
  mode: AppMode;
  actor: AuthenticatedUser;
  hospitals: HospitalInput[];
}): Promise<MciHospitalRequestListItem[]> {
  await ensureTriageIncidentTables();
  const hospitals = await resolveHospitals(input.hospitals);
  if (hospitals.length === 0) {
    throw new Error("依頼先病院を解決できませんでした。");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const incidentRes = await client.query<IncidentRow>(
      `
        SELECT
          id,
          incident_code,
          source_case_uid,
          status,
          address,
          aware_date::text AS aware_date,
          summary,
          notes,
          command_team_id,
          start_red_count,
          start_yellow_count,
          start_green_count,
          start_black_count,
          pat_red_count,
          pat_yellow_count,
          pat_green_count,
          pat_black_count,
          approved_at::text AS approved_at
        FROM triage_incidents
        WHERE id = $1
          AND mode = $2
          AND status = 'ACTIVE'
        FOR UPDATE
        LIMIT 1
      `,
      [input.incidentId, input.mode],
    );
    const incident = incidentRes.rows[0];
    if (!incident) {
      await client.query("ROLLBACK");
      throw new Error("有効なMCIインシデントが見つかりません。");
    }

    const startCounts = {
      red: incident.start_red_count,
      yellow: incident.start_yellow_count,
      green: incident.start_green_count,
      black: incident.start_black_count,
    };
    const patCounts = {
      red: incident.pat_red_count,
      yellow: incident.pat_yellow_count,
      green: incident.pat_green_count,
      black: incident.pat_black_count,
    };

    for (const hospital of hospitals) {
      const requestId = `mci-${incident.incident_code ?? incident.id}-${hospital.id}`;
      const requestRes = await client.query<{ id: number; inserted: boolean }>(
        `
          INSERT INTO triage_hospital_requests (
            incident_id,
            request_id,
            hospital_id,
            status,
            disaster_summary,
            start_counts,
            pat_counts,
            notes,
            created_by_user_id,
            sent_at,
            updated_at
          ) VALUES ($1, $2, $3, 'UNREAD', $4, $5::jsonb, $6::jsonb, $7, $8, NOW(), NOW())
          ON CONFLICT (incident_id, hospital_id)
          DO UPDATE SET
            disaster_summary = EXCLUDED.disaster_summary,
            start_counts = EXCLUDED.start_counts,
            pat_counts = EXCLUDED.pat_counts,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING id, (xmax = 0) AS inserted
        `,
        [
          incident.id,
          requestId,
          hospital.id,
          incident.summary,
          JSON.stringify(startCounts),
          JSON.stringify(patCounts),
          incident.notes,
          input.actor.id,
        ],
      );
      const requestPk = requestRes.rows[0]?.id;
      if (!requestPk) continue;

      await createNotification(
        {
          audienceRole: "HOSPITAL",
          mode: input.mode,
          hospitalId: hospital.id,
          kind: "mci_triage_request_received",
          title: "大規模災害TRIAGE受入依頼",
          body: `${incident.incident_code ?? "MCI"} / ${incident.summary}。色別受入可能人数を返答してください。`,
          menuKey: "hospitals-requests",
          severity: "critical",
          dedupeKey: `mci-hospital-request:${requestPk}`,
        },
        client,
      );
    }

    await client.query("COMMIT");
    return listMciHospitalRequestsForDispatch(input.incidentId, input.mode);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listMciHospitalRequestsForHospital(
  hospitalId: number,
  mode: AppMode,
): Promise<MciHospitalRequestListItem[]> {
  await ensureTriageIncidentTables();
  const res = await db.query<MciHospitalRequestRow>(
    `
      SELECT
        r.id,
        r.request_id,
        r.incident_id,
        i.incident_code,
        r.hospital_id,
        h.name AS hospital_name,
        r.status,
        r.disaster_summary,
        r.start_counts,
        r.pat_counts,
        r.notes,
        r.sent_at::text AS sent_at,
        o.red_capacity,
        o.id AS offer_id,
        o.yellow_capacity,
        o.green_capacity,
        o.black_capacity,
        o.notes AS offer_notes,
        o.responded_at::text AS responded_at
      FROM triage_hospital_requests r
      JOIN triage_incidents i ON i.id = r.incident_id
      JOIN hospitals h ON h.id = r.hospital_id
      LEFT JOIN triage_hospital_offers o ON o.request_id = r.id
      WHERE r.hospital_id = $1
        AND i.mode = $2
        AND i.status = 'ACTIVE'
      ORDER BY r.sent_at DESC, r.id DESC
    `,
    [hospitalId, mode],
  );
  return res.rows.map(toHospitalRequest);
}

export async function respondMciHospitalRequest(input: {
  requestId: number;
  hospitalId: number;
  mode: AppMode;
  actor: AuthenticatedUser;
  status: "ACCEPTABLE" | "NOT_ACCEPTABLE";
  capacities: TriageColorCounts;
  notes: string;
}): Promise<MciHospitalRequestListItem> {
  await ensureTriageIncidentTables();
  const capacities = normalizeCounts(input.capacities);
  if (input.status === "ACCEPTABLE" && capacities.red + capacities.yellow + capacities.green + capacities.black < 1) {
    throw new Error("受入可能の場合は色別受入可能人数を1名以上入力してください。");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const requestRes = await client.query<{ id: number; incident_id: number }>(
      `
        UPDATE triage_hospital_requests r
        SET status = $4,
            updated_at = NOW()
        FROM triage_incidents i
        WHERE r.id = $1
          AND r.hospital_id = $2
          AND i.id = r.incident_id
          AND i.mode = $3
          AND i.status = 'ACTIVE'
        RETURNING r.id, r.incident_id
      `,
      [input.requestId, input.hospitalId, input.mode, input.status],
    );
    const request = requestRes.rows[0];
    if (!request) {
      await client.query("ROLLBACK");
      throw new Error("対象のMCI受入依頼が見つかりません。");
    }

    if (input.status === "ACCEPTABLE") {
      await client.query(
        `
          INSERT INTO triage_hospital_offers (
            request_id,
            hospital_id,
            red_capacity,
            yellow_capacity,
            green_capacity,
            black_capacity,
            notes,
            responded_by_user_id,
            responded_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          ON CONFLICT (request_id)
          DO UPDATE SET
            red_capacity = EXCLUDED.red_capacity,
            yellow_capacity = EXCLUDED.yellow_capacity,
            green_capacity = EXCLUDED.green_capacity,
            black_capacity = EXCLUDED.black_capacity,
            notes = EXCLUDED.notes,
            responded_by_user_id = EXCLUDED.responded_by_user_id,
            responded_at = NOW(),
            updated_at = NOW()
        `,
        [
          request.id,
          input.hospitalId,
          capacities.red,
          capacities.yellow,
          capacities.green,
          capacities.black,
          input.notes.trim(),
          input.actor.id,
        ],
      );
    } else {
      await client.query("DELETE FROM triage_hospital_offers WHERE request_id = $1", [request.id]);
    }

    await client.query("COMMIT");
    const rows = await listMciHospitalRequestsForHospital(input.hospitalId, input.mode);
    const updated = rows.find((row) => row.id === request.id);
    if (!updated) throw new Error("MCI受入依頼の更新結果を取得できませんでした。");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function getIncidentAccess(input: {
  incidentId: number;
  teamId: number;
  mode: AppMode;
}): Promise<IncidentAccessRow | null> {
  const res = await db.query<IncidentAccessRow>(
    `
      SELECT
        i.id,
        i.incident_code,
        i.mode,
        i.status,
        i.command_team_id,
        it.role AS team_role
      FROM triage_incidents i
      LEFT JOIN triage_incident_teams it ON it.incident_id = i.id AND it.team_id = $2
      WHERE i.id = $1
        AND i.mode = $3
      LIMIT 1
    `,
    [input.incidentId, input.teamId, input.mode],
  );
  return res.rows[0] ?? null;
}

function assertCommanderAccess(access: IncidentAccessRow | null, teamId: number): asserts access is IncidentAccessRow {
  if (!access || access.status !== "ACTIVE") {
    throw new Error("有効なMCIインシデントが見つかりません。");
  }
  if (access.command_team_id !== teamId || access.team_role !== "COMMANDER") {
    throw new Error("統括救急隊のみ操作できます。");
  }
}

async function listPatientsForIncident(incidentId: number): Promise<MciPatientItem[]> {
  const res = await db.query<PatientRow>(
    `
      SELECT
        id,
        patient_no,
        registration_status,
        current_tag,
        start_tag,
        pat_tag,
        injury_details,
        assigned_team_id,
        assigned_hospital_id,
        transport_assignment_id
      FROM triage_patients
      WHERE incident_id = $1
        AND registration_status <> 'CANCELLED'
      ORDER BY patient_no ASC, id ASC
    `,
    [incidentId],
  );
  return res.rows.map(toPatient);
}

async function listAssignmentsByWhere(whereSql: string, values: unknown[]): Promise<MciTransportAssignmentItem[]> {
  const assignmentRes = await db.query<AssignmentRow>(
    `
      SELECT
        a.id,
        a.incident_id,
        i.incident_code,
        a.hospital_offer_id,
        a.hospital_id,
        h.name AS hospital_name,
        a.team_id,
        et.team_name,
        et.team_code,
        a.status,
        a.sent_at::text AS sent_at,
        a.decided_at::text AS decided_at
      FROM triage_transport_assignments a
      JOIN triage_incidents i ON i.id = a.incident_id
      JOIN hospitals h ON h.id = a.hospital_id
      JOIN emergency_teams et ON et.id = a.team_id
      ${whereSql}
      ORDER BY a.updated_at DESC, a.id DESC
    `,
    values,
  );
  if (assignmentRes.rows.length === 0) return [];

  const assignmentIds = assignmentRes.rows.map((row) => row.id);
  const patientRes = await db.query<PatientRow>(
    `
      SELECT
        id,
        patient_no,
        registration_status,
        current_tag,
        start_tag,
        pat_tag,
        injury_details,
        assigned_team_id,
        assigned_hospital_id,
        transport_assignment_id
      FROM triage_patients
      WHERE transport_assignment_id = ANY($1::bigint[])
      ORDER BY patient_no ASC, id ASC
    `,
    [assignmentIds],
  );
  const patientsByAssignment = new Map<number, MciPatientItem[]>();
  for (const patient of patientRes.rows.map(toPatient)) {
    if (!patient.transportAssignmentId) continue;
    const patients = patientsByAssignment.get(patient.transportAssignmentId) ?? [];
    patients.push(patient);
    patientsByAssignment.set(patient.transportAssignmentId, patients);
  }

  return assignmentRes.rows.map((row) => toTransportAssignment(row, patientsByAssignment.get(row.id) ?? []));
}

export async function listMciIncidentsForTeam(teamId: number, mode: AppMode): Promise<MciIncidentSummary[]> {
  await ensureTriageIncidentTables();
  const res = await db.query<IncidentRow>(
    `
      SELECT
        i.id,
        i.incident_code,
        i.source_case_uid,
        i.status,
        i.address,
        i.aware_date::text AS aware_date,
        i.summary,
        i.notes,
        i.command_team_id,
        i.start_red_count,
        i.start_yellow_count,
        i.start_green_count,
        i.start_black_count,
        i.pat_red_count,
        i.pat_yellow_count,
        i.pat_green_count,
        i.pat_black_count,
        i.approved_at::text AS approved_at
      FROM triage_incidents i
      JOIN triage_incident_teams it ON it.incident_id = i.id
      WHERE it.team_id = $1
        AND i.mode = $2
        AND i.status = 'ACTIVE'
        AND it.participation_status <> 'LEFT'
      ORDER BY i.updated_at DESC, i.id DESC
    `,
    [teamId, mode],
  );
  const incidents: MciIncidentSummary[] = [];
  for (const row of res.rows) {
    incidents.push(toIncident(row, await getIncidentTeams(row.id)));
  }
  return incidents;
}

export async function getMciIncidentWorkspaceForTeam(input: {
  incidentId: number;
  teamId: number;
  mode: AppMode;
}): Promise<{
  incident: MciIncidentSummary;
  patients: MciPatientItem[];
  hospitalRequests: MciHospitalRequestListItem[];
  assignments: MciTransportAssignmentItem[];
}> {
  await ensureTriageIncidentTables();
  const access = await getIncidentAccess(input);
  if (!access || !access.team_role || access.status !== "ACTIVE") {
    throw new Error("参加中のMCIインシデントが見つかりません。");
  }

  const incidentRes = await db.query<IncidentRow>(
    `
      SELECT
        id,
        incident_code,
        source_case_uid,
        status,
        address,
        aware_date::text AS aware_date,
        summary,
        notes,
        command_team_id,
        start_red_count,
        start_yellow_count,
        start_green_count,
        start_black_count,
        pat_red_count,
        pat_yellow_count,
        pat_green_count,
        pat_black_count,
        approved_at::text AS approved_at
      FROM triage_incidents
      WHERE id = $1
        AND mode = $2
      LIMIT 1
    `,
    [input.incidentId, input.mode],
  );
  const incidentRow = incidentRes.rows[0];
  if (!incidentRow) throw new Error("MCIインシデントが見つかりません。");

  return {
    incident: toIncident(incidentRow, await getIncidentTeams(input.incidentId)),
    patients: await listPatientsForIncident(input.incidentId),
    hospitalRequests: await listMciHospitalRequestsForDispatch(input.incidentId, input.mode),
    assignments: await listAssignmentsByWhere(
      `
        WHERE a.incident_id = $1
          AND i.mode = $2
          AND ($3::boolean = TRUE OR a.team_id = $4)
      `,
      [input.incidentId, input.mode, access.team_role === "COMMANDER", input.teamId],
    ),
  };
}

export async function updateMciIncidentParticipation(input: {
  incidentId: number;
  teamId: number;
  mode: AppMode;
  status: "JOINED" | "ARRIVED" | "AVAILABLE" | "LEFT";
}): Promise<void> {
  await ensureTriageIncidentTables();
  const res = await db.query(
    `
      UPDATE triage_incident_teams it
      SET participation_status = $4,
          triage_mode_acknowledged_at = CASE WHEN $4 IN ('JOINED', 'ARRIVED', 'AVAILABLE') THEN COALESCE(triage_mode_acknowledged_at, NOW()) ELSE triage_mode_acknowledged_at END,
          last_seen_at = NOW(),
          updated_at = NOW()
      FROM triage_incidents i
      WHERE i.id = it.incident_id
        AND it.incident_id = $1
        AND it.team_id = $2
        AND i.mode = $3
        AND i.status = 'ACTIVE'
    `,
    [input.incidentId, input.teamId, input.mode, input.status],
  );
  if ((res.rowCount ?? 0) === 0) {
    throw new Error("参加中のMCIインシデントが見つかりません。");
  }
}

export async function createMciPatient(input: {
  incidentId: number;
  teamId: number;
  mode: AppMode;
  currentTag: unknown;
  startTag?: unknown;
  patTag?: unknown;
  injuryDetails: string;
}): Promise<MciPatientItem> {
  await ensureTriageIncidentTables();
  const access = await getIncidentAccess({ incidentId: input.incidentId, teamId: input.teamId, mode: input.mode });
  assertCommanderAccess(access, input.teamId);
  if (!isTriageTag(input.currentTag)) throw new Error("現在タグが不正です。");

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`mci-patient-no:${input.incidentId}`]);
    const seqRes = await client.query<{ last_no: string }>(
      `
        SELECT COALESCE(MAX(NULLIF(regexp_replace(patient_no, '[^0-9]', '', 'g'), '')::int), 0)::text AS last_no
        FROM triage_patients
        WHERE incident_id = $1
      `,
      [input.incidentId],
    );
    const nextNo = Number(seqRes.rows[0]?.last_no ?? 0) + 1;
    const patientNo = `P-${String(nextNo).padStart(3, "0")}`;
    const insertRes = await client.query<PatientRow>(
      `
        INSERT INTO triage_patients (
          incident_id,
          patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          registered_by_team_id,
          confirmed_by_team_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, 'CONFIRMED', $3, $4, $5, $6, $7, $7, NOW(), NOW())
        RETURNING
          id,
          patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
      `,
      [
        input.incidentId,
        patientNo,
        input.currentTag,
        isTriageTag(input.startTag) ? input.startTag : null,
        isTriageTag(input.patTag) ? input.patTag : null,
        input.injuryDetails.trim(),
        input.teamId,
      ],
    );
    await client.query("COMMIT");
    const patient = insertRes.rows[0];
    if (!patient) throw new Error("患者番号の作成に失敗しました。");
    return toPatient(patient);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function countTags(patients: Array<{ current_tag: MciPatientItem["currentTag"] }>): TriageColorCounts {
  return patients.reduce<TriageColorCounts>((acc, patient) => {
    const key = patient.current_tag.toLowerCase() as keyof TriageColorCounts;
    acc[key] += 1;
    return acc;
  }, initialTriageColorCounts());
}

function assertCapacityWithinOffer(
  offer: OfferCapacityRow,
  current: TriageColorCounts,
  adding: TriageColorCounts,
) {
  const over =
    current.red + adding.red > offer.red_capacity ||
    current.yellow + adding.yellow > offer.yellow_capacity ||
    current.green + adding.green > offer.green_capacity ||
    current.black + adding.black > offer.black_capacity;
  if (over) {
    throw new Error(
      `病院の色別受入可能人数を超えています。残枠: 赤${offer.red_capacity - current.red} / 黄${offer.yellow_capacity - current.yellow} / 緑${offer.green_capacity - current.green} / 黒${offer.black_capacity - current.black}`,
    );
  }
}

export async function createMciTransportAssignment(input: {
  incidentId: number;
  teamId: number;
  mode: AppMode;
  targetTeamId: number;
  hospitalOfferId: number;
  patientIds: number[];
}): Promise<MciTransportAssignmentItem> {
  await ensureTriageIncidentTables();
  const access = await getIncidentAccess({ incidentId: input.incidentId, teamId: input.teamId, mode: input.mode });
  assertCommanderAccess(access, input.teamId);
  const patientIds = Array.from(new Set(input.patientIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (patientIds.length === 0) throw new Error("搬送する傷病者を選択してください。");

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const targetTeamRes = await client.query<{ team_id: number }>(
      `
        SELECT team_id
        FROM triage_incident_teams
        WHERE incident_id = $1
          AND team_id = $2
          AND participation_status <> 'LEFT'
        LIMIT 1
      `,
      [input.incidentId, input.targetTeamId],
    );
    if (!targetTeamRes.rows[0]) {
      await client.query("ROLLBACK");
      throw new Error("搬送隊は同一インシデントの参加隊から選択してください。");
    }

    const offerRes = await client.query<OfferCapacityRow>(
      `
        SELECT
          o.id,
          r.incident_id,
          o.hospital_id,
          h.name AS hospital_name,
          o.red_capacity,
          o.yellow_capacity,
          o.green_capacity,
          o.black_capacity
        FROM triage_hospital_offers o
        JOIN triage_hospital_requests r ON r.id = o.request_id
        JOIN hospitals h ON h.id = o.hospital_id
        WHERE o.id = $1
          AND r.incident_id = $2
          AND r.status = 'ACCEPTABLE'
        FOR UPDATE
        LIMIT 1
      `,
      [input.hospitalOfferId, input.incidentId],
    );
    const offer = offerRes.rows[0];
    if (!offer) {
      await client.query("ROLLBACK");
      throw new Error("受入可能な病院枠が見つかりません。");
    }

    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
        FROM triage_patients
        WHERE incident_id = $1
          AND id = ANY($2::bigint[])
          AND registration_status = 'CONFIRMED'
        FOR UPDATE
      `,
      [input.incidentId, patientIds],
    );
    if (patientRes.rows.length !== patientIds.length) {
      await client.query("ROLLBACK");
      throw new Error("選択した傷病者の一部が見つからないか、確定済みではありません。");
    }
    if (patientRes.rows.some((patient) => patient.transport_assignment_id != null)) {
      await client.query("ROLLBACK");
      throw new Error("既に搬送割当済みの傷病者が含まれています。");
    }

    const existingUsageRes = await client.query<{ current_tag: MciPatientItem["currentTag"] }>(
      `
        SELECT p.current_tag
        FROM triage_patients p
        JOIN triage_transport_assignments a ON a.id = p.transport_assignment_id
        WHERE a.hospital_offer_id = $1
          AND a.status IN ('SENT_TO_TEAM', 'TRANSPORT_DECIDED', 'ARRIVED')
      `,
      [offer.id],
    );
    assertCapacityWithinOffer(offer, countTags(existingUsageRes.rows), countTags(patientRes.rows));

    const assignmentRes = await client.query<{ id: number }>(
      `
        INSERT INTO triage_transport_assignments (
          incident_id,
          hospital_offer_id,
          hospital_id,
          team_id,
          status,
          assigned_by_team_id,
          sent_at,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, 'SENT_TO_TEAM', $5, NOW(), NOW(), NOW())
        RETURNING id
      `,
      [input.incidentId, offer.id, offer.hospital_id, input.targetTeamId, input.teamId],
    );
    const assignmentId = assignmentRes.rows[0]?.id;
    if (!assignmentId) throw new Error("搬送割当の作成に失敗しました。");

    await client.query(
      `
        UPDATE triage_patients
        SET assigned_team_id = $3,
            assigned_hospital_id = $4,
            transport_assignment_id = $5,
            updated_at = NOW()
        WHERE incident_id = $1
          AND id = ANY($2::bigint[])
      `,
      [input.incidentId, patientIds, input.targetTeamId, offer.hospital_id, assignmentId],
    );

    await createNotification(
      {
        audienceRole: "EMS",
        mode: input.mode,
        teamId: input.targetTeamId,
        kind: "mci_transport_assignment_received",
        title: "MCI搬送割当",
        body: `${access.incident_code ?? "MCI"} / ${offer.hospital_name} へ ${patientIds.length}名の搬送割当が届きました。搬送決定を押してください。`,
        menuKey: "cases-list",
        severity: "critical",
        dedupeKey: `mci-transport-assignment:${assignmentId}`,
      },
      client,
    );

    await client.query("COMMIT");
    const assignments = await listAssignmentsByWhere("WHERE a.id = $1", [assignmentId]);
    const assignment = assignments[0];
    if (!assignment) throw new Error("搬送割当の取得に失敗しました。");
    return assignment;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function decideMciTransportAssignment(input: {
  assignmentId: number;
  teamId: number;
  mode: AppMode;
}): Promise<MciTransportAssignmentItem> {
  await ensureTriageIncidentTables();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const assignmentRes = await client.query<AssignmentRow>(
      `
        UPDATE triage_transport_assignments a
        SET status = 'TRANSPORT_DECIDED',
            decided_at = NOW(),
            updated_at = NOW()
        FROM triage_incidents i, hospitals h, emergency_teams et
        WHERE a.id = $1
          AND a.team_id = $2
          AND i.id = a.incident_id
          AND i.mode = $3
          AND i.status = 'ACTIVE'
          AND h.id = a.hospital_id
          AND et.id = a.team_id
          AND a.status = 'SENT_TO_TEAM'
        RETURNING
          a.id,
          a.incident_id,
          i.incident_code,
          a.hospital_offer_id,
          a.hospital_id,
          h.name AS hospital_name,
          a.team_id,
          et.team_name,
          et.team_code,
          a.status,
          a.sent_at::text AS sent_at,
          a.decided_at::text AS decided_at
      `,
      [input.assignmentId, input.teamId, input.mode],
    );
    const assignment = assignmentRes.rows[0];
    if (!assignment) {
      await client.query("ROLLBACK");
      throw new Error("搬送決定可能なMCI搬送割当が見つかりません。");
    }

    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
        FROM triage_patients
        WHERE transport_assignment_id = $1
        ORDER BY patient_no ASC
      `,
      [assignment.id],
    );
    const patients = patientRes.rows.map(toPatient);

    await createNotification(
      {
        audienceRole: "HOSPITAL",
        mode: input.mode,
        hospitalId: assignment.hospital_id,
        kind: "mci_transport_decided",
        title: "MCI搬送決定",
        body: `${assignment.incident_code ?? "MCI"} / ${assignment.team_name} が ${patients.map((patient) => patient.patientNo).join(", ")} の搬送を決定しました。`,
        menuKey: "hospitals-requests",
        severity: "critical",
        dedupeKey: `mci-transport-decided:${assignment.id}`,
      },
      client,
    );

    await client.query("COMMIT");
    return toTransportAssignment(assignment, patients);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listMciTransportAssignmentsForHospital(
  hospitalId: number,
  mode: AppMode,
): Promise<MciTransportAssignmentItem[]> {
  await ensureTriageIncidentTables();
  return listAssignmentsByWhere(
    `
      WHERE a.hospital_id = $1
        AND i.mode = $2
        AND a.status IN ('TRANSPORT_DECIDED', 'ARRIVED')
    `,
    [hospitalId, mode],
  );
}
