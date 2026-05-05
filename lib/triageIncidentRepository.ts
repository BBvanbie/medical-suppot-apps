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

export class MciWorkflowError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "MciWorkflowError";
    this.code = code;
    this.status = status;
  }
}

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
    expiresAt: string;
    isExpired: boolean;
    notes: string;
    respondedAt: string;
  } | null;
};

export type MciPatientItem = {
  id: number;
  patientNo: string | null;
  provisionalPatientNo: string | null;
  registrationStatus: "DRAFT" | "PENDING_COMMAND_REVIEW" | "CONFIRMED" | "MERGED" | "CANCELLED";
  currentTag: "RED" | "YELLOW" | "GREEN" | "BLACK";
  startTag: "RED" | "YELLOW" | "GREEN" | "BLACK" | null;
  patTag: "RED" | "YELLOW" | "GREEN" | "BLACK" | null;
  injuryDetails: string;
  reviewedAt: string | null;
  reviewReason: string | null;
  mergedIntoPatientId: number | null;
  startAlgorithmVersionId: number | null;
  patAlgorithmVersionId: number | null;
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
  status: "DRAFT" | "SENT_TO_TEAM" | "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | "DEPARTED" | "ARRIVED" | "HANDOFF_COMPLETED";
  patientCount: number;
  patients: MciPatientItem[];
  sentAt: string | null;
  decidedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  departedAt: string | null;
  arrivedAt: string | null;
  handoffCompletedAt: string | null;
};

export type MciAuditEventItem = {
  id: number;
  incidentId: number | null;
  incidentCode: string;
  mode: AppMode;
  eventType: string;
  actorUserId: number | null;
  actorTeamId: number | null;
  actorHospitalId: number | null;
  targetType: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
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
  expires_at: string | null;
  offer_notes: string | null;
  responded_at: string | null;
};

type PatientRow = {
  id: number;
  patient_no: string | null;
  provisional_patient_no: string | null;
  registration_status: MciPatientItem["registrationStatus"];
  current_tag: MciPatientItem["currentTag"];
  start_tag: MciPatientItem["startTag"];
  pat_tag: MciPatientItem["patTag"];
  injury_details: string;
  reviewed_at: string | null;
  review_reason: string | null;
  merged_into_patient_id: number | null;
  start_algorithm_version_id: number | null;
  pat_algorithm_version_id: number | null;
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
  declined_at: string | null;
  decline_reason: string | null;
  departed_at: string | null;
  arrived_at: string | null;
  handoff_completed_at: string | null;
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
  expires_at: string;
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
            expiresAt: row.expires_at ?? row.responded_at,
            isExpired: row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : false,
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
    provisionalPatientNo: row.provisional_patient_no,
    registrationStatus: row.registration_status,
    currentTag: row.current_tag,
    startTag: row.start_tag,
    patTag: row.pat_tag,
    injuryDetails: row.injury_details,
    reviewedAt: row.reviewed_at,
    reviewReason: row.review_reason,
    mergedIntoPatientId: row.merged_into_patient_id,
    startAlgorithmVersionId: row.start_algorithm_version_id,
    patAlgorithmVersionId: row.pat_algorithm_version_id,
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
    declinedAt: row.declined_at,
    declineReason: row.decline_reason,
    departedAt: row.departed_at,
    arrivedAt: row.arrived_at,
    handoffCompletedAt: row.handoff_completed_at,
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
        o.expires_at::text AS expires_at,
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
        o.expires_at::text AS expires_at,
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
    const requestRes = await client.query<{ id: number; incident_id: number; incident_code: string | null }>(
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
        RETURNING r.id, r.incident_id, i.incident_code
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
            expires_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + INTERVAL '15 minutes', NOW())
          ON CONFLICT (request_id)
          DO UPDATE SET
            red_capacity = EXCLUDED.red_capacity,
            yellow_capacity = EXCLUDED.yellow_capacity,
            green_capacity = EXCLUDED.green_capacity,
            black_capacity = EXCLUDED.black_capacity,
            notes = EXCLUDED.notes,
            responded_by_user_id = EXCLUDED.responded_by_user_id,
            responded_at = NOW(),
            expires_at = NOW() + INTERVAL '15 minutes',
            cancelled_at = NULL,
            cancel_reason = NULL,
            cancelled_by_user_id = NULL,
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

    await createMciAuditEvent(client, {
      incidentId: request.incident_id,
      incidentCode: request.incident_code,
      mode: input.mode,
      eventType: input.status === "ACCEPTABLE" ? "HOSPITAL_OFFER_ACCEPTABLE" : "HOSPITAL_OFFER_NOT_ACCEPTABLE",
      actorUserId: input.actor.id,
      actorHospitalId: input.hospitalId,
      targetType: "triage_hospital_request",
      targetId: request.id,
      payload: {
        status: input.status,
        capacities,
      },
    });

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
    throw new MciWorkflowError("有効なMCIインシデントが見つかりません。", "INCIDENT_NOT_ACTIVE", 404);
  }
  if (access.command_team_id !== teamId || access.team_role !== "COMMANDER") {
    throw new MciWorkflowError("統括救急隊のみ操作できます。", "COMMANDER_REQUIRED", 403);
  }
}

function assertParticipantAccess(access: IncidentAccessRow | null): asserts access is IncidentAccessRow {
  if (!access || access.status !== "ACTIVE" || !access.team_role) {
    throw new MciWorkflowError("参加中のMCIインシデントが見つかりません。", "INCIDENT_PARTICIPATION_REQUIRED", 403);
  }
}

async function getApprovedAlgorithmVersionIds(client: Pick<typeof db, "query">): Promise<{
  startAlgorithmVersionId: number | null;
  patAlgorithmVersionId: number | null;
}> {
  const res = await client.query<{ method: "START" | "PAT"; id: number }>(
    `
      SELECT DISTINCT ON (method) method, id
      FROM triage_algorithm_versions
      WHERE status = 'APPROVED'
        AND method IN ('START', 'PAT')
      ORDER BY method, approved_at DESC NULLS LAST, id DESC
    `,
  );
  return {
    startAlgorithmVersionId: res.rows.find((row) => row.method === "START")?.id ?? null,
    patAlgorithmVersionId: res.rows.find((row) => row.method === "PAT")?.id ?? null,
  };
}

async function createMciAuditEvent(
  client: Pick<typeof db, "query">,
  input: {
    incidentId: number | null;
    incidentCode: string | null;
    mode: AppMode;
    eventType: string;
    actorUserId?: number | null;
    actorTeamId?: number | null;
    actorHospitalId?: number | null;
    targetType: string;
    targetId?: string | number | null;
    payload?: Record<string, unknown>;
  },
) {
  await client.query(
    `
      INSERT INTO triage_audit_events (
        incident_id,
        incident_code,
        mode,
        event_type,
        actor_user_id,
        actor_team_id,
        actor_hospital_id,
        target_type,
        target_id,
        payload,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
    `,
    [
      input.incidentId,
      input.incidentCode ?? (input.incidentId ? `MCI-${input.incidentId}` : "UNKNOWN"),
      input.mode,
      input.eventType,
      input.actorUserId ?? null,
      input.actorTeamId ?? null,
      input.actorHospitalId ?? null,
      input.targetType,
      input.targetId == null ? null : String(input.targetId),
      JSON.stringify(input.payload ?? {}),
    ],
  );
}

async function listPatientsForIncident(incidentId: number): Promise<MciPatientItem[]> {
  const res = await db.query<PatientRow>(
    `
      SELECT
        id,
        patient_no,
        provisional_patient_no,
        registration_status,
        current_tag,
        start_tag,
        pat_tag,
        injury_details,
        reviewed_at::text AS reviewed_at,
        review_reason,
        merged_into_patient_id,
        start_algorithm_version_id,
        pat_algorithm_version_id,
        assigned_team_id,
        assigned_hospital_id,
        transport_assignment_id
      FROM triage_patients
      WHERE incident_id = $1
        AND registration_status <> 'CANCELLED'
      ORDER BY COALESCE(patient_no, provisional_patient_no, id::text) ASC, id ASC
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
        a.decided_at::text AS decided_at,
        a.declined_at::text AS declined_at,
        a.decline_reason,
        a.departed_at::text AS departed_at,
        a.arrived_at::text AS arrived_at,
        a.handoff_completed_at::text AS handoff_completed_at
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
        provisional_patient_no,
        registration_status,
        current_tag,
        start_tag,
        pat_tag,
        injury_details,
        reviewed_at::text AS reviewed_at,
        review_reason,
        merged_into_patient_id,
        start_algorithm_version_id,
        pat_algorithm_version_id,
        assigned_team_id,
        assigned_hospital_id,
        transport_assignment_id
      FROM triage_patients
      WHERE transport_assignment_id = ANY($1::bigint[])
      ORDER BY COALESCE(patient_no, provisional_patient_no, id::text) ASC, id ASC
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

export async function requestMciCommandCandidate(input: {
  incidentId: number;
  teamId: number;
  mode: AppMode;
  note: string;
}): Promise<void> {
  await ensureTriageIncidentTables();
  const res = await db.query(
    `
      UPDATE triage_incident_teams it
      SET role = CASE WHEN it.role = 'TRANSPORT' THEN 'COMMAND_CANDIDATE' ELSE it.role END,
          command_requested_at = NOW(),
          command_request_note = $4,
          last_seen_at = NOW(),
          updated_at = NOW()
      FROM triage_incidents i
      WHERE i.id = it.incident_id
        AND it.incident_id = $1
        AND it.team_id = $2
        AND i.mode = $3
        AND i.status = 'ACTIVE'
        AND it.participation_status <> 'LEFT'
    `,
    [input.incidentId, input.teamId, input.mode, input.note.trim()],
  );
  if ((res.rowCount ?? 0) === 0) {
    throw new MciWorkflowError("統括候補申告できるMCIインシデントが見つかりません。", "COMMAND_CANDIDATE_NOT_ALLOWED", 403);
  }
}

export async function transitionMciCommander(input: {
  incidentId: number;
  mode: AppMode;
  actor: AuthenticatedUser;
  toTeamId: number;
  reason: string;
}): Promise<MciIncidentSummary> {
  await ensureTriageIncidentTables();
  const reason = input.reason.trim();
  if (!reason) throw new MciWorkflowError("統括救急隊交代理由を入力してください。", "COMMAND_TRANSITION_REASON_REQUIRED", 400);

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
      `,
      [input.incidentId, input.mode],
    );
    const incident = incidentRes.rows[0];
    if (!incident) throw new MciWorkflowError("有効なMCIインシデントが見つかりません。", "INCIDENT_NOT_ACTIVE", 404);

    const targetTeamRes = await client.query<{ team_id: number }>(
      `
        SELECT team_id
        FROM triage_incident_teams
        WHERE incident_id = $1
          AND team_id = $2
          AND participation_status <> 'LEFT'
        FOR UPDATE
      `,
      [input.incidentId, input.toTeamId],
    );
    if (!targetTeamRes.rows[0]) {
      throw new MciWorkflowError("新しい統括救急隊は同一インシデントの参加隊から選択してください。", "COMMAND_TEAM_NOT_IN_INCIDENT", 400);
    }

    const fromTeamId = incident.command_team_id;
    if (fromTeamId === input.toTeamId) {
      throw new MciWorkflowError("指定済みの統括救急隊です。", "COMMAND_TEAM_UNCHANGED", 409);
    }

    await client.query(
      `
        UPDATE triage_incident_teams
        SET role = CASE
              WHEN team_id = $2 THEN 'COMMANDER'
              WHEN role = 'COMMANDER' THEN 'TRANSPORT'
              ELSE role
            END,
            updated_at = NOW()
        WHERE incident_id = $1
      `,
      [input.incidentId, input.toTeamId],
    );
    await client.query(
      `
        UPDATE triage_incidents
        SET command_team_id = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [input.incidentId, input.toTeamId],
    );
    await client.query(
      `
        INSERT INTO triage_incident_command_transitions (
          incident_id,
          from_team_id,
          to_team_id,
          reason,
          approved_by_user_id,
          transitioned_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [input.incidentId, fromTeamId, input.toTeamId, reason, input.actor.id],
    );
    await createMciAuditEvent(client, {
      incidentId: input.incidentId,
      incidentCode: incident.incident_code,
      mode: input.mode,
      eventType: "COMMAND_TEAM_TRANSITIONED",
      actorUserId: input.actor.id,
      targetType: "triage_incident",
      targetId: input.incidentId,
      payload: { fromTeamId, toTeamId: input.toTeamId, reason },
    });
    await createNotification(
      {
        audienceRole: "EMS",
        mode: input.mode,
        teamId: input.toTeamId,
        kind: "mci_commander_designated",
        title: "統括救急隊交代",
        body: `${incident.incident_code ?? "MCI"} の統括救急隊に指定されました。理由: ${reason}`,
        menuKey: "cases-list",
        severity: "critical",
        dedupeKey: `mci-commander-transition:${input.incidentId}:${input.toTeamId}`,
      },
      client,
    );

    await client.query("COMMIT");
    return toIncident({ ...incident, command_team_id: input.toTeamId }, await getIncidentTeams(input.incidentId));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
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
  if (!isTriageTag(input.currentTag)) throw new MciWorkflowError("現在タグが不正です。", "INVALID_TRIAGE_TAG", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`mci-patient-no:${input.incidentId}`]);
    const algorithmVersions = await getApprovedAlgorithmVersionIds(client);
    const seqRes = await client.query<{ last_no: string }>(
      `
        SELECT COALESCE(MAX(NULLIF(regexp_replace(patient_no, '[^0-9]', '', 'g'), '')::int), 0)::text AS last_no
        FROM triage_patients
        WHERE incident_id = $1
          AND patient_no IS NOT NULL
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
          start_algorithm_version_id,
          pat_algorithm_version_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, 'CONFIRMED', $3, $4, $5, $6, $7, $7, $8, $9, NOW(), NOW())
        RETURNING
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
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
        algorithmVersions.startAlgorithmVersionId,
        algorithmVersions.patAlgorithmVersionId,
      ],
    );
    const patient = insertRes.rows[0];
    if (!patient) throw new MciWorkflowError("患者番号の作成に失敗しました。", "PATIENT_CREATE_FAILED", 500);
    await client.query(
      `
        INSERT INTO triage_patient_tag_events (
          incident_id,
          patient_id,
          from_tag,
          to_tag,
          reason,
          source,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          acted_by_team_id,
          acted_at
        ) VALUES ($1, $2, NULL, $3, $4, 'REVIEW', $5, $6, $7, NOW())
      `,
      [
        input.incidentId,
        patient.id,
        input.currentTag,
        "統括救急隊による即時確定登録",
        algorithmVersions.startAlgorithmVersionId,
        algorithmVersions.patAlgorithmVersionId,
        input.teamId,
      ],
    );
    await createMciAuditEvent(client, {
      incidentId: input.incidentId,
      incidentCode: access.incident_code,
      mode: input.mode,
      eventType: "PATIENT_CONFIRMED_CREATED",
      actorTeamId: input.teamId,
      targetType: "triage_patient",
      targetId: patient.id,
      payload: { patientNo: patient.patient_no, currentTag: patient.current_tag },
    });
    await client.query("COMMIT");
    return toPatient(patient);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function createMciProvisionalPatient(input: {
  incidentId: number;
  teamId: number;
  mode: AppMode;
  actorUserId?: number | null;
  currentTag: unknown;
  startTag?: unknown;
  patTag?: unknown;
  injuryDetails: string;
}): Promise<MciPatientItem> {
  await ensureTriageIncidentTables();
  const access = await getIncidentAccess({ incidentId: input.incidentId, teamId: input.teamId, mode: input.mode });
  assertParticipantAccess(access);
  if (!isTriageTag(input.currentTag)) throw new MciWorkflowError("現在タグが不正です。", "INVALID_TRIAGE_TAG", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`mci-provisional-patient-no:${input.incidentId}:${input.teamId}`]);
    const algorithmVersions = await getApprovedAlgorithmVersionIds(client);
    const seqRes = await client.query<{ last_no: string }>(
      `
        SELECT COALESCE(MAX(NULLIF(regexp_replace(provisional_patient_no, '[^0-9]', '', 'g'), '')::int), 0)::text AS last_no
        FROM triage_patients
        WHERE incident_id = $1
          AND registered_by_team_id = $2
          AND provisional_patient_no IS NOT NULL
      `,
      [input.incidentId, input.teamId],
    );
    const nextNo = Number(seqRes.rows[0]?.last_no ?? 0) + 1;
    const provisionalNo = `TMP-${input.teamId}-${String(nextNo).padStart(3, "0")}`;
    const insertRes = await client.query<PatientRow>(
      `
        INSERT INTO triage_patients (
          incident_id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          registered_by_team_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          created_at,
          updated_at
        ) VALUES ($1, NULL, $2, 'PENDING_COMMAND_REVIEW', $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
      `,
      [
        input.incidentId,
        provisionalNo,
        input.currentTag,
        isTriageTag(input.startTag) ? input.startTag : null,
        isTriageTag(input.patTag) ? input.patTag : null,
        input.injuryDetails.trim(),
        input.teamId,
        algorithmVersions.startAlgorithmVersionId,
        algorithmVersions.patAlgorithmVersionId,
      ],
    );
    const patient = insertRes.rows[0];
    if (!patient) throw new MciWorkflowError("仮登録傷病者の作成に失敗しました。", "PROVISIONAL_PATIENT_CREATE_FAILED", 500);
    await createMciAuditEvent(client, {
      incidentId: input.incidentId,
      incidentCode: access.incident_code,
      mode: input.mode,
      eventType: "PATIENT_PROVISIONAL_CREATED",
      actorUserId: input.actorUserId ?? null,
      actorTeamId: input.teamId,
      targetType: "triage_patient",
      targetId: patient.id,
      payload: { provisionalPatientNo: provisionalNo, currentTag: patient.current_tag },
    });
    await client.query("COMMIT");
    return toPatient(patient);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function reviewMciProvisionalPatient(input: {
  incidentId: number;
  patientId: number;
  teamId: number;
  mode: AppMode;
  actorUserId?: number | null;
  action: "APPROVE" | "MERGE" | "RETURN";
  mergeIntoPatientId?: number | null;
  reason: string;
}): Promise<MciPatientItem> {
  await ensureTriageIncidentTables();
  const access = await getIncidentAccess({ incidentId: input.incidentId, teamId: input.teamId, mode: input.mode });
  assertCommanderAccess(access, input.teamId);
  const reason = input.reason.trim();
  if ((input.action === "MERGE" || input.action === "RETURN") && !reason) {
    throw new MciWorkflowError("統合または差戻しには理由が必要です。", "REVIEW_REASON_REQUIRED", 400);
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`mci-patient-review:${input.incidentId}`]);
    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
        FROM triage_patients
        WHERE id = $1
          AND incident_id = $2
        FOR UPDATE
      `,
      [input.patientId, input.incidentId],
    );
    const provisional = patientRes.rows[0];
    if (!provisional || provisional.registration_status !== "PENDING_COMMAND_REVIEW") {
      throw new MciWorkflowError("レビュー待ちの仮登録傷病者が見つかりません。", "PROVISIONAL_PATIENT_NOT_REVIEWABLE", 409);
    }

    let updated: PatientRow | undefined;
    if (input.action === "APPROVE") {
      const seqRes = await client.query<{ last_no: string }>(
        `
          SELECT COALESCE(MAX(NULLIF(regexp_replace(patient_no, '[^0-9]', '', 'g'), '')::int), 0)::text AS last_no
          FROM triage_patients
          WHERE incident_id = $1
            AND patient_no IS NOT NULL
        `,
        [input.incidentId],
      );
      const patientNo = `P-${String(Number(seqRes.rows[0]?.last_no ?? 0) + 1).padStart(3, "0")}`;
      const updateRes = await client.query<PatientRow>(
        `
          UPDATE triage_patients
          SET patient_no = $3,
              registration_status = 'CONFIRMED',
              confirmed_by_team_id = $4,
              reviewed_by_team_id = $4,
              reviewed_at = NOW(),
              review_reason = $5,
              updated_at = NOW()
          WHERE id = $1
            AND incident_id = $2
          RETURNING
            id,
            patient_no,
            provisional_patient_no,
            registration_status,
            current_tag,
            start_tag,
            pat_tag,
            injury_details,
            reviewed_at::text AS reviewed_at,
            review_reason,
            merged_into_patient_id,
            start_algorithm_version_id,
            pat_algorithm_version_id,
            assigned_team_id,
            assigned_hospital_id,
            transport_assignment_id
        `,
        [input.patientId, input.incidentId, patientNo, input.teamId, reason],
      );
      updated = updateRes.rows[0];
    } else if (input.action === "MERGE") {
      if (!input.mergeIntoPatientId) {
        throw new MciWorkflowError("統合先の正式傷病者を指定してください。", "MERGE_TARGET_REQUIRED", 400);
      }
      const targetRes = await client.query<{ id: number }>(
        `
          SELECT id
          FROM triage_patients
          WHERE id = $1
            AND incident_id = $2
            AND registration_status = 'CONFIRMED'
            AND patient_no IS NOT NULL
          FOR UPDATE
        `,
        [input.mergeIntoPatientId, input.incidentId],
      );
      if (!targetRes.rows[0]) throw new MciWorkflowError("統合先の正式傷病者が見つかりません。", "MERGE_TARGET_NOT_FOUND", 404);
      const updateRes = await client.query<PatientRow>(
        `
          UPDATE triage_patients
          SET registration_status = 'MERGED',
              reviewed_by_team_id = $3,
              reviewed_at = NOW(),
              review_reason = $4,
              merged_into_patient_id = $5,
              updated_at = NOW()
          WHERE id = $1
            AND incident_id = $2
          RETURNING
            id,
            patient_no,
            provisional_patient_no,
            registration_status,
            current_tag,
            start_tag,
            pat_tag,
            injury_details,
            reviewed_at::text AS reviewed_at,
            review_reason,
            merged_into_patient_id,
            start_algorithm_version_id,
            pat_algorithm_version_id,
            assigned_team_id,
            assigned_hospital_id,
            transport_assignment_id
        `,
        [input.patientId, input.incidentId, input.teamId, reason, input.mergeIntoPatientId],
      );
      updated = updateRes.rows[0];
    } else {
      const updateRes = await client.query<PatientRow>(
        `
          UPDATE triage_patients
          SET registration_status = 'CANCELLED',
              reviewed_by_team_id = $3,
              reviewed_at = NOW(),
              review_reason = $4,
              updated_at = NOW()
          WHERE id = $1
            AND incident_id = $2
          RETURNING
            id,
            patient_no,
            provisional_patient_no,
            registration_status,
            current_tag,
            start_tag,
            pat_tag,
            injury_details,
            reviewed_at::text AS reviewed_at,
            review_reason,
            merged_into_patient_id,
            start_algorithm_version_id,
            pat_algorithm_version_id,
            assigned_team_id,
            assigned_hospital_id,
            transport_assignment_id
        `,
        [input.patientId, input.incidentId, input.teamId, reason],
      );
      updated = updateRes.rows[0];
    }

    if (!updated) throw new MciWorkflowError("仮登録傷病者のレビュー更新に失敗しました。", "PROVISIONAL_PATIENT_REVIEW_FAILED", 500);
    await createMciAuditEvent(client, {
      incidentId: input.incidentId,
      incidentCode: access.incident_code,
      mode: input.mode,
      eventType: `PATIENT_PROVISIONAL_${input.action}`,
      actorUserId: input.actorUserId ?? null,
      actorTeamId: input.teamId,
      targetType: "triage_patient",
      targetId: updated.id,
      payload: {
        provisionalPatientNo: updated.provisional_patient_no,
        patientNo: updated.patient_no,
        mergedIntoPatientId: updated.merged_into_patient_id,
        reason,
      },
    });
    await client.query("COMMIT");
    return toPatient(updated);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMciPatientTag(input: {
  incidentId: number;
  patientId: number;
  teamId: number;
  mode: AppMode;
  actorUserId?: number | null;
  toTag: unknown;
  reason: string;
  source?: "START" | "PAT" | "MANUAL_OVERRIDE" | "REVIEW";
}): Promise<MciPatientItem> {
  await ensureTriageIncidentTables();
  const access = await getIncidentAccess({ incidentId: input.incidentId, teamId: input.teamId, mode: input.mode });
  assertCommanderAccess(access, input.teamId);
  if (!isTriageTag(input.toTag)) throw new MciWorkflowError("変更後タグが不正です。", "INVALID_TRIAGE_TAG", 400);
  const reason = input.reason.trim();
  if (!reason) throw new MciWorkflowError("タグ変更理由を入力してください。", "TAG_CHANGE_REASON_REQUIRED", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
        FROM triage_patients
        WHERE id = $1
          AND incident_id = $2
          AND registration_status = 'CONFIRMED'
        FOR UPDATE
      `,
      [input.patientId, input.incidentId],
    );
    const patient = patientRes.rows[0];
    if (!patient) throw new MciWorkflowError("タグ変更対象の正式傷病者が見つかりません。", "PATIENT_NOT_FOUND", 404);
    const updateRes = await client.query<PatientRow>(
      `
        UPDATE triage_patients
        SET current_tag = $3,
            updated_at = NOW()
        WHERE id = $1
          AND incident_id = $2
        RETURNING
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
      `,
      [input.patientId, input.incidentId, input.toTag],
    );
    const updated = updateRes.rows[0];
    if (!updated) throw new MciWorkflowError("タグ変更に失敗しました。", "TAG_CHANGE_FAILED", 500);
    await client.query(
      `
        INSERT INTO triage_patient_tag_events (
          incident_id,
          patient_id,
          from_tag,
          to_tag,
          reason,
          source,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          acted_by_team_id,
          acted_by_user_id,
          acted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `,
      [
        input.incidentId,
        input.patientId,
        patient.current_tag,
        input.toTag,
        reason,
        input.source ?? "MANUAL_OVERRIDE",
        patient.start_algorithm_version_id,
        patient.pat_algorithm_version_id,
        input.teamId,
        input.actorUserId ?? null,
      ],
    );
    await createMciAuditEvent(client, {
      incidentId: input.incidentId,
      incidentCode: access.incident_code,
      mode: input.mode,
      eventType: "PATIENT_TAG_CHANGED",
      actorUserId: input.actorUserId ?? null,
      actorTeamId: input.teamId,
      targetType: "triage_patient",
      targetId: updated.id,
      payload: { patientNo: updated.patient_no, fromTag: patient.current_tag, toTag: updated.current_tag, reason },
    });
    await client.query("COMMIT");
    return toPatient(updated);
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
    throw new MciWorkflowError(
      `病院の色別受入可能人数を超えています。残枠: 赤${offer.red_capacity - current.red} / 黄${offer.yellow_capacity - current.yellow} / 緑${offer.green_capacity - current.green} / 黒${offer.black_capacity - current.black}`,
      "CAPACITY_EXCEEDED",
      409,
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
  if (patientIds.length === 0) throw new MciWorkflowError("搬送する傷病者を選択してください。", "PATIENT_SELECTION_REQUIRED", 400);

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
      throw new MciWorkflowError("搬送隊は同一インシデントの参加隊から選択してください。", "TARGET_TEAM_NOT_IN_INCIDENT", 400);
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
          o.black_capacity,
          o.expires_at::text AS expires_at
        FROM triage_hospital_offers o
        JOIN triage_hospital_requests r ON r.id = o.request_id
        JOIN hospitals h ON h.id = o.hospital_id
        WHERE o.id = $1
          AND r.incident_id = $2
          AND r.status = 'ACCEPTABLE'
          AND o.cancelled_at IS NULL
        FOR UPDATE
        LIMIT 1
      `,
      [input.hospitalOfferId, input.incidentId],
    );
    const offer = offerRes.rows[0];
    if (!offer) {
      await client.query("ROLLBACK");
      throw new MciWorkflowError("受入可能な病院枠が見つかりません。", "OFFER_NOT_FOUND", 404);
    }
    if (new Date(offer.expires_at).getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      throw new MciWorkflowError("受入可能病院枠の期限が切れています。dispatchから再依頼してください。", "OFFER_EXPIRED", 409);
    }

    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
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
      throw new MciWorkflowError("選択した傷病者の一部が見つからないか、確定済みではありません。", "PATIENT_NOT_ASSIGNABLE", 409);
    }
    if (patientRes.rows.some((patient) => patient.transport_assignment_id != null)) {
      await client.query("ROLLBACK");
      throw new MciWorkflowError("既に搬送割当済みの傷病者が含まれています。", "PATIENT_ALREADY_ASSIGNED", 409);
    }

    const existingUsageRes = await client.query<{ current_tag: MciPatientItem["currentTag"] }>(
      `
        SELECT p.current_tag
        FROM triage_patients p
        JOIN triage_transport_assignments a ON a.id = p.transport_assignment_id
        WHERE a.hospital_offer_id = $1
          AND a.status IN ('SENT_TO_TEAM', 'TRANSPORT_DECIDED', 'DEPARTED', 'ARRIVED', 'HANDOFF_COMPLETED')
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
    if (!assignmentId) throw new MciWorkflowError("搬送割当の作成に失敗しました。", "ASSIGNMENT_CREATE_FAILED", 500);

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

    await createMciAuditEvent(client, {
      incidentId: input.incidentId,
      incidentCode: access.incident_code,
      mode: input.mode,
      eventType: "TRANSPORT_ASSIGNMENT_CREATED",
      actorTeamId: input.teamId,
      targetType: "triage_transport_assignment",
      targetId: assignmentId,
      payload: {
        targetTeamId: input.targetTeamId,
        hospitalOfferId: offer.id,
        hospitalId: offer.hospital_id,
        patientCount: patientIds.length,
      },
    });

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
          a.decided_at::text AS decided_at,
          a.declined_at::text AS declined_at,
          a.decline_reason,
          a.departed_at::text AS departed_at,
          a.arrived_at::text AS arrived_at,
          a.handoff_completed_at::text AS handoff_completed_at
      `,
      [input.assignmentId, input.teamId, input.mode],
    );
    const assignment = assignmentRes.rows[0];
    if (!assignment) {
      await client.query("ROLLBACK");
      throw new MciWorkflowError("搬送決定可能なMCI搬送割当が見つかりません。", "ASSIGNMENT_NOT_DECIDABLE", 409);
    }

    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
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

    await createMciAuditEvent(client, {
      incidentId: assignment.incident_id,
      incidentCode: assignment.incident_code,
      mode: input.mode,
      eventType: "TRANSPORT_DECIDED",
      actorTeamId: input.teamId,
      targetType: "triage_transport_assignment",
      targetId: assignment.id,
      payload: { patientCount: patients.length, hospitalId: assignment.hospital_id },
    });

    await client.query("COMMIT");
    return toTransportAssignment(assignment, patients);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMciTransportAssignmentStatus(input: {
  assignmentId: number;
  teamId: number;
  mode: AppMode;
  nextStatus: "TRANSPORT_DECLINED" | "DEPARTED" | "ARRIVED";
  reason?: string;
}): Promise<MciTransportAssignmentItem> {
  await ensureTriageIncidentTables();
  const transition = {
    TRANSPORT_DECLINED: { from: "SENT_TO_TEAM", timestampColumn: "declined_at", eventType: "TRANSPORT_DECLINED" },
    DEPARTED: { from: "TRANSPORT_DECIDED", timestampColumn: "departed_at", eventType: "TRANSPORT_DEPARTED" },
    ARRIVED: { from: "DEPARTED", timestampColumn: "arrived_at", eventType: "TRANSPORT_ARRIVED" },
  }[input.nextStatus];
  const reason = (input.reason ?? "").trim();
  if (input.nextStatus === "TRANSPORT_DECLINED" && !reason) {
    throw new MciWorkflowError("搬送辞退には理由が必要です。", "DECLINE_REASON_REQUIRED", 400);
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const assignmentRes = await client.query<AssignmentRow>(
      `
        UPDATE triage_transport_assignments a
        SET status = $4,
            ${transition.timestampColumn} = NOW(),
            decline_reason = CASE WHEN $4 = 'TRANSPORT_DECLINED' THEN $5 ELSE decline_reason END,
            updated_at = NOW()
        FROM triage_incidents i, hospitals h, emergency_teams et
        WHERE a.id = $1
          AND a.team_id = $2
          AND i.id = a.incident_id
          AND i.mode = $3
          AND i.status = 'ACTIVE'
          AND h.id = a.hospital_id
          AND et.id = a.team_id
          AND a.status = $6
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
          a.decided_at::text AS decided_at,
          a.declined_at::text AS declined_at,
          a.decline_reason,
          a.departed_at::text AS departed_at,
          a.arrived_at::text AS arrived_at,
          a.handoff_completed_at::text AS handoff_completed_at
      `,
      [input.assignmentId, input.teamId, input.mode, input.nextStatus, reason, transition.from],
    );
    const assignment = assignmentRes.rows[0];
    if (!assignment) {
      await client.query("ROLLBACK");
      throw new MciWorkflowError("搬送ステータスを更新できる割当が見つかりません。", "ASSIGNMENT_STATUS_CONFLICT", 409);
    }

    if (input.nextStatus === "TRANSPORT_DECLINED") {
      await client.query(
        `
          UPDATE triage_patients
          SET assigned_team_id = NULL,
              assigned_hospital_id = NULL,
              transport_assignment_id = NULL,
              updated_at = NOW()
          WHERE transport_assignment_id = $1
        `,
        [assignment.id],
      );
    }

    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
        FROM triage_patients
        WHERE transport_assignment_id = $1
        ORDER BY COALESCE(patient_no, provisional_patient_no, id::text) ASC
      `,
      [assignment.id],
    );
    const patients = patientRes.rows.map(toPatient);

    await createMciAuditEvent(client, {
      incidentId: assignment.incident_id,
      incidentCode: assignment.incident_code,
      mode: input.mode,
      eventType: transition.eventType,
      actorTeamId: input.teamId,
      targetType: "triage_transport_assignment",
      targetId: assignment.id,
      payload: { reason, patientCount: patients.length },
    });

    await client.query("COMMIT");
    return toTransportAssignment(assignment, patients);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function completeMciTransportHandoff(input: {
  assignmentId: number;
  hospitalId: number;
  mode: AppMode;
  actorUserId?: number | null;
}): Promise<MciTransportAssignmentItem> {
  await ensureTriageIncidentTables();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const assignmentRes = await client.query<AssignmentRow>(
      `
        UPDATE triage_transport_assignments a
        SET status = 'HANDOFF_COMPLETED',
            handoff_completed_at = NOW(),
            handoff_by_user_id = $4,
            updated_at = NOW()
        FROM triage_incidents i, hospitals h, emergency_teams et
        WHERE a.id = $1
          AND a.hospital_id = $2
          AND i.id = a.incident_id
          AND i.mode = $3
          AND i.status = 'ACTIVE'
          AND h.id = a.hospital_id
          AND et.id = a.team_id
          AND a.status = 'ARRIVED'
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
          a.decided_at::text AS decided_at,
          a.declined_at::text AS declined_at,
          a.decline_reason,
          a.departed_at::text AS departed_at,
          a.arrived_at::text AS arrived_at,
          a.handoff_completed_at::text AS handoff_completed_at
      `,
      [input.assignmentId, input.hospitalId, input.mode, input.actorUserId ?? null],
    );
    const assignment = assignmentRes.rows[0];
    if (!assignment) {
      await client.query("ROLLBACK");
      throw new MciWorkflowError("引継完了にできるMCI搬送割当が見つかりません。", "HANDOFF_STATUS_CONFLICT", 409);
    }

    const patientRes = await client.query<PatientRow>(
      `
        SELECT
          id,
          patient_no,
          provisional_patient_no,
          registration_status,
          current_tag,
          start_tag,
          pat_tag,
          injury_details,
          reviewed_at::text AS reviewed_at,
          review_reason,
          merged_into_patient_id,
          start_algorithm_version_id,
          pat_algorithm_version_id,
          assigned_team_id,
          assigned_hospital_id,
          transport_assignment_id
        FROM triage_patients
        WHERE transport_assignment_id = $1
        ORDER BY COALESCE(patient_no, provisional_patient_no, id::text) ASC
      `,
      [assignment.id],
    );
    const patients = patientRes.rows.map(toPatient);
    await createMciAuditEvent(client, {
      incidentId: assignment.incident_id,
      incidentCode: assignment.incident_code,
      mode: input.mode,
      eventType: "TRANSPORT_HANDOFF_COMPLETED",
      actorUserId: input.actorUserId ?? null,
      actorHospitalId: input.hospitalId,
      targetType: "triage_transport_assignment",
      targetId: assignment.id,
      payload: { patientCount: patients.length },
    });
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
        AND a.status IN ('TRANSPORT_DECIDED', 'DEPARTED', 'ARRIVED', 'HANDOFF_COMPLETED')
    `,
    [hospitalId, mode],
  );
}

export async function listMciAuditEvents(input: {
  incidentId: number;
  mode: AppMode;
  limit?: number;
}): Promise<MciAuditEventItem[]> {
  await ensureTriageIncidentTables();
  const limit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 100)));
  const res = await db.query<{
    id: number;
    incident_id: number | null;
    incident_code: string;
    mode: AppMode;
    event_type: string;
    actor_user_id: number | null;
    actor_team_id: number | null;
    actor_hospital_id: number | null;
    target_type: string;
    target_id: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
  }>(
    `
      SELECT
        ae.id,
        ae.incident_id,
        ae.incident_code,
        ae.mode,
        ae.event_type,
        ae.actor_user_id,
        ae.actor_team_id,
        ae.actor_hospital_id,
        ae.target_type,
        ae.target_id,
        ae.payload,
        ae.created_at::text AS created_at
      FROM triage_audit_events ae
      JOIN triage_incidents i ON i.id = ae.incident_id
      WHERE ae.incident_id = $1
        AND ae.mode = $2
        AND i.mode = $2
      ORDER BY ae.created_at DESC, ae.id DESC
      LIMIT $3
    `,
    [input.incidentId, input.mode, limit],
  );
  return res.rows.map((row) => ({
    id: row.id,
    incidentId: row.incident_id,
    incidentCode: row.incident_code,
    mode: row.mode,
    eventType: row.event_type,
    actorUserId: row.actor_user_id,
    actorTeamId: row.actor_team_id,
    actorHospitalId: row.actor_hospital_id,
    targetType: row.target_type,
    targetId: row.target_id,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  }));
}

export async function closeMciIncident(input: {
  incidentId: number;
  mode: AppMode;
  actor: AuthenticatedUser;
  closureType: "NORMAL" | "FORCED";
  reason: string;
}): Promise<{ incidentId: number; status: "CLOSED"; report: Record<string, unknown> }> {
  await ensureTriageIncidentTables();
  const reason = input.reason.trim();
  if (input.closureType === "FORCED" && !reason) {
    throw new MciWorkflowError("強制終了には理由が必要です。", "FORCED_CLOSE_REASON_REQUIRED", 400);
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const incidentRes = await client.query<{
      id: number;
      incident_code: string | null;
      mode: AppMode;
      status: MciIncidentSummary["status"];
    }>(
      `
        SELECT id, incident_code, mode, status
        FROM triage_incidents
        WHERE id = $1
          AND mode = $2
        FOR UPDATE
      `,
      [input.incidentId, input.mode],
    );
    const incident = incidentRes.rows[0];
    if (!incident || incident.status !== "ACTIVE") {
      throw new MciWorkflowError("終了可能なMCIインシデントが見つかりません。", "INCIDENT_NOT_ACTIVE", 404);
    }

    const blockerRes = await client.query<{
      incomplete_assignments: string;
      unassigned_confirmed_patients: string;
    }>(
      `
        SELECT
          (
            SELECT COUNT(*)::text
            FROM triage_transport_assignments
            WHERE incident_id = $1
              AND status NOT IN ('TRANSPORT_DECLINED', 'HANDOFF_COMPLETED')
          ) AS incomplete_assignments,
          (
            SELECT COUNT(*)::text
            FROM triage_patients
            WHERE incident_id = $1
              AND registration_status = 'CONFIRMED'
              AND transport_assignment_id IS NULL
          ) AS unassigned_confirmed_patients
      `,
      [input.incidentId],
    );
    const blockers = {
      incompleteAssignments: Number(blockerRes.rows[0]?.incomplete_assignments ?? 0),
      unassignedConfirmedPatients: Number(blockerRes.rows[0]?.unassigned_confirmed_patients ?? 0),
    };
    if (input.closureType === "NORMAL" && (blockers.incompleteAssignments > 0 || blockers.unassignedConfirmedPatients > 0)) {
      throw new MciWorkflowError(
        `未完了搬送または未割当傷病者が残っています。未完了搬送${blockers.incompleteAssignments}件 / 未割当${blockers.unassignedConfirmedPatients}名`,
        "INCIDENT_CLOSE_BLOCKED",
        409,
      );
    }

    const reportRes = await client.query<{
      patient_counts: Record<string, unknown> | null;
      assignment_counts: Record<string, unknown> | null;
      hospital_counts: Record<string, unknown> | null;
    }>(
      `
        SELECT
          COALESCE(
            (
              SELECT jsonb_object_agg(current_tag, count)
              FROM (
                SELECT current_tag, COUNT(*)::int AS count
                FROM triage_patients
                WHERE incident_id = $1
                  AND registration_status = 'CONFIRMED'
                GROUP BY current_tag
              ) patient_counts
            ),
            '{}'::jsonb
          ) AS patient_counts,
          COALESCE(
            (
              SELECT jsonb_object_agg(status, count)
              FROM (
                SELECT status, COUNT(*)::int AS count
                FROM triage_transport_assignments
                WHERE incident_id = $1
                GROUP BY status
              ) assignment_counts
            ),
            '{}'::jsonb
          ) AS assignment_counts,
          COALESCE(
            (
              SELECT jsonb_object_agg(h.name, count)
              FROM (
                SELECT hospital_id, COUNT(*)::int AS count
                FROM triage_transport_assignments
                WHERE incident_id = $1
                  AND status IN ('TRANSPORT_DECIDED', 'DEPARTED', 'ARRIVED', 'HANDOFF_COMPLETED')
                GROUP BY hospital_id
              ) hc
              JOIN hospitals h ON h.id = hc.hospital_id
            ),
            '{}'::jsonb
          ) AS hospital_counts
      `,
      [input.incidentId],
    );
    const report = {
      closureType: input.closureType,
      reason,
      blockers,
      patientCounts: reportRes.rows[0]?.patient_counts ?? {},
      assignmentCounts: reportRes.rows[0]?.assignment_counts ?? {},
      hospitalCounts: reportRes.rows[0]?.hospital_counts ?? {},
      generatedAt: new Date().toISOString(),
    };

    await client.query(
      `
        UPDATE triage_incidents
        SET status = 'CLOSED',
            closed_at = NOW(),
            closed_by_user_id = $3,
            closure_type = $4,
            closure_reason = $5,
            closure_review = $6::jsonb,
            updated_at = NOW()
        WHERE id = $1
          AND mode = $2
      `,
      [input.incidentId, input.mode, input.actor.id, input.closureType, reason, JSON.stringify({ blockers })],
    );
    await client.query(
      `
        INSERT INTO triage_incident_reports (
          incident_id,
          report_json,
          generated_by_user_id,
          generated_at,
          updated_at
        ) VALUES ($1, $2::jsonb, $3, NOW(), NOW())
        ON CONFLICT (incident_id)
        DO UPDATE SET
          report_json = EXCLUDED.report_json,
          generated_by_user_id = EXCLUDED.generated_by_user_id,
          generated_at = NOW(),
          updated_at = NOW()
      `,
      [input.incidentId, JSON.stringify(report), input.actor.id],
    );
    await createMciAuditEvent(client, {
      incidentId: input.incidentId,
      incidentCode: incident.incident_code,
      mode: input.mode,
      eventType: "INCIDENT_CLOSED",
      actorUserId: input.actor.id,
      targetType: "triage_incident",
      targetId: input.incidentId,
      payload: { closureType: input.closureType, reason, blockers },
    });
    await client.query("COMMIT");
    return { incidentId: input.incidentId, status: "CLOSED", report };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
