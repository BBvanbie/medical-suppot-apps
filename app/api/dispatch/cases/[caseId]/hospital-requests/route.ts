import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getAuthenticatedUser } from "@/lib/authContext";
import { pickPatientSummaryFromCasePayload } from "@/lib/casePatientSummary";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { resolveCaseByAnyId } from "@/lib/caseAccess";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { createNotification } from "@/lib/notifications";

type Params = {
  params: Promise<{ caseId: string }>;
};

type HospitalRequestInput = {
  hospitalId?: unknown;
  hospitalName?: unknown;
  departments?: unknown;
  distanceKm?: unknown;
};

type PostBody = {
  hospitals?: unknown;
  selectedDepartments?: unknown;
};

type DbHospital = {
  id: number;
  source_no: number;
  name: string;
};

type DispatchRequestRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  sent_at: string;
  status: string;
  hospital_name: string;
  selected_departments: string[] | null;
  accepted_capacity: number | null;
};

type ResolvedDispatchHospital = {
  hospital: DbHospital;
  departments: string[];
  distanceKm: number | null;
};

type DispatchSelectionFlow = "TRIAGE" | "CRITICAL_CARE";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isTriageDispatchReport(casePayload: unknown): boolean {
  const payload = asObject(casePayload);
  const summary = asObject(payload.summary);
  return summary.triageDispatchReport === true || summary.triageWorkflow === "DISPATCH_COORDINATED";
}

function isCriticalCareDispatchSelection(casePayload: unknown): boolean {
  const payload = asObject(casePayload);
  const summary = asObject(payload.summary);
  const request = asObject(summary.dispatchSelectionRequest);
  return request.flow === "CRITICAL_CARE" || request.status === "REQUESTED";
}

function resolveDispatchSelectionFlow(casePayload: unknown): DispatchSelectionFlow | null {
  if (isTriageDispatchReport(casePayload)) return "TRIAGE";
  if (isCriticalCareDispatchSelection(casePayload)) return "CRITICAL_CARE";
  return null;
}

function normalizeHospitals(value: unknown): HospitalRequestInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HospitalRequestInput => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function createRequestId(caseUid: string, flow: DispatchSelectionFlow) {
  const prefix = flow === "TRIAGE" ? "triage-dispatch" : "critical-dispatch";
  return `${prefix}-${caseUid}-${Date.now()}`;
}

async function resolveDispatchHospitals(
  hospitals: HospitalRequestInput[],
  fallbackDepartments: string[],
): Promise<ResolvedDispatchHospital[]> {
  const sourceNos = hospitals
    .map((hospital) => Number(hospital.hospitalId))
    .filter((value) => Number.isFinite(value));
  const names = hospitals
    .map((hospital) => String(hospital.hospitalName ?? "").trim())
    .filter(Boolean);

  const found = await db.query<DbHospital>(
    `
      SELECT id, source_no, name
      FROM hospitals
      WHERE (array_length($1::int[], 1) IS NOT NULL AND source_no = ANY($1::int[]))
         OR (array_length($2::text[], 1) IS NOT NULL AND name = ANY($2::text[]))
    `,
    [sourceNos.length > 0 ? sourceNos : null, names.length > 0 ? names : null],
  );

  const bySourceNo = new Map(found.rows.map((hospital) => [hospital.source_no, hospital]));
  const byName = new Map(found.rows.map((hospital) => [hospital.name, hospital]));

  return hospitals
    .map((input) => {
      const sourceNo = Number(input.hospitalId);
      const hospitalName = String(input.hospitalName ?? "").trim();
      const hospital = bySourceNo.get(sourceNo) ?? byName.get(hospitalName) ?? null;
      if (!hospital) return null;
      const departments = asStringArray(input.departments);
      const distance = Number(input.distanceKm);
      return {
        hospital,
        departments: departments.length > 0 ? departments : fallbackDepartments,
        distanceKm: Number.isFinite(distance) ? distance : null,
      };
    })
    .filter((item): item is ResolvedDispatchHospital => item !== null);
}

async function listDispatchHospitalRequests(caseId: string, mode: "LIVE" | "TRAINING") {
  const rows = await db.query<DispatchRequestRow>(
    `
      SELECT
        t.id AS target_id,
        r.request_id,
        r.case_id,
        r.sent_at::text AS sent_at,
        t.status,
        h.name AS hospital_name,
        COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
        t.accepted_capacity
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN hospitals h ON h.id = t.hospital_id
      WHERE (r.case_id = $1 OR r.case_uid = $1)
        AND r.mode = $2
        AND (
          COALESCE(r.patient_summary->>'triageDispatchManaged', '') = 'true'
          OR COALESCE(r.patient_summary->>'dispatchSelectionManaged', '') = 'true'
        )
      ORDER BY
        CASE t.status
          WHEN 'ACCEPTABLE' THEN 0
          WHEN 'NEGOTIATING' THEN 1
          WHEN 'READ' THEN 2
          WHEN 'UNREAD' THEN 3
          WHEN 'TRANSPORT_DECIDED' THEN 4
          ELSE 5
        END,
        r.sent_at DESC,
        t.id DESC
    `,
    [caseId, mode],
  );

  return rows.rows.map((row) => {
    const status = isHospitalRequestStatus(row.status) ? row.status : "UNREAD";
    return {
      targetId: row.target_id,
      requestId: row.request_id,
      caseId: row.case_id,
      sentAt: row.sent_at,
      rawStatus: status,
      statusLabel: getStatusLabel(status),
      hospitalName: row.hospital_name,
      selectedDepartments: row.selected_departments ?? [],
      acceptedCapacity: row.accepted_capacity,
      canSendToEms: status === "ACCEPTABLE",
    };
  });
}

async function insertDispatchHospitalRequests(
  client: PoolClient,
  input: {
    caseId: string;
    caseUid: string;
    mode: "LIVE" | "TRAINING";
    teamId: number | null;
    casePayload: unknown;
    actorId: number;
    hospitals: ResolvedDispatchHospital[];
    flow: DispatchSelectionFlow;
    selectedDepartments: string[];
  },
) {
  const hospitalIds = input.hospitals.map((target) => target.hospital.id);
  const existingRes = await client.query<{ hospital_id: number }>(
    `
      SELECT t.hospital_id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      WHERE r.case_uid = $1
        AND t.hospital_id = ANY($2::int[])
        AND (
          ($3 = 'TRIAGE' AND COALESCE(r.patient_summary->>'triageDispatchManaged', '') = 'true')
          OR ($3 = 'CRITICAL_CARE' AND COALESCE(r.patient_summary->>'dispatchSelectionManaged', '') = 'true')
        )
        AND t.status IN ('UNREAD', 'READ', 'NEGOTIATING', 'ACCEPTABLE', 'TRANSPORT_DECIDED')
      FOR UPDATE OF t
    `,
    [input.caseUid, hospitalIds, input.flow],
  );
  const existingHospitalIds = new Set(existingRes.rows.map((row) => Number(row.hospital_id)));
  const newHospitals = input.hospitals.filter((target) => !existingHospitalIds.has(target.hospital.id));
  if (newHospitals.length === 0) return;

  const baseSummary = pickPatientSummaryFromCasePayload(input.casePayload);
  const patientSummary =
    input.flow === "TRIAGE"
      ? {
          ...baseSummary,
          operationalMode: "TRIAGE",
          triage: true,
          isTriageRequest: true,
          dispatchManaged: true,
          triageDispatchManaged: true,
        }
      : {
          ...baseSummary,
          operationalMode: "STANDARD",
          dispatchManaged: true,
          dispatchSelectionManaged: true,
          dispatchSelectionType: "CRITICAL_CARE",
          dispatchSelectionStatus: "HOSPITAL_REQUESTED",
          requestedDepartments: input.selectedDepartments,
        };
  const now = new Date();
  const requestRes = await client.query<{ id: number }>(
    `
      INSERT INTO hospital_requests (
        request_id,
        case_id,
        case_uid,
        mode,
        patient_summary,
        from_team_id,
        created_by_user_id,
        first_sent_at,
        sent_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $8, NOW())
      RETURNING id
    `,
    [
      createRequestId(input.caseUid, input.flow),
      input.caseId,
      input.caseUid,
      input.mode,
      JSON.stringify(patientSummary),
      input.teamId,
      input.actorId,
      now.toISOString(),
    ],
  );

  const requestPk = requestRes.rows[0]?.id;
  if (!requestPk) throw new Error("failed to create dispatch hospital request");

  for (const target of newHospitals) {
    const targetRes = await client.query<{ id: number; inserted: boolean }>(
      `
        INSERT INTO hospital_request_targets (
          hospital_request_id,
          hospital_id,
          status,
          selected_departments,
          distance_km,
          updated_by_user_id,
          updated_at
        ) VALUES ($1, $2, 'UNREAD', $3::jsonb, $4, $5, NOW())
        ON CONFLICT (hospital_request_id, hospital_id)
        DO UPDATE SET
          selected_departments = EXCLUDED.selected_departments,
          distance_km = EXCLUDED.distance_km,
          updated_by_user_id = EXCLUDED.updated_by_user_id,
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS inserted
      `,
      [requestPk, target.hospital.id, JSON.stringify(target.departments), target.distanceKm, input.actorId],
    );

    const targetId = targetRes.rows[0]?.id;
    if (!targetId) continue;

    await client.query(
      `
        INSERT INTO hospital_request_events (
          target_id,
          event_type,
          from_status,
          to_status,
          acted_by_user_id,
          note,
          acted_at
        ) VALUES ($1, 'sent', NULL, 'UNREAD', $2, $3, NOW())
      `,
      [
        targetId,
        input.actorId,
        input.flow === "TRIAGE" ? "dispatchからTRIAGE受入依頼" : "dispatchから救命・CCU選定依頼",
      ],
    );

    await createNotification(
      {
        audienceRole: "HOSPITAL",
        mode: input.mode,
        hospitalId: target.hospital.id,
        kind: input.flow === "TRIAGE" ? "triage_request_received" : "dispatch_selection_request_received",
        caseId: input.caseId,
        caseUid: input.caseUid,
        targetId,
        title: input.flow === "TRIAGE" ? "TRIAGE受入依頼" : "本部選定依頼",
        body:
          input.flow === "TRIAGE"
            ? `事案 ${input.caseId} のTRIAGE受入依頼がdispatchから届きました。受入可否と可能人数を返答してください。`
            : `事案 ${input.caseId} の救命・CCU選定依頼が本部から届きました。受入可否を返答してください。`,
        menuKey: "hospitals-requests",
        dedupeKey: `${input.flow === "TRIAGE" ? "triage" : "critical"}-request-received:${targetId}`,
      },
      client,
    );
  }
}

export async function GET(_: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;
  await ensureHospitalRequestTables();
  return NextResponse.json({ rows: await listDispatchHospitalRequests(caseId, user.currentMode) });
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;
  const body = ((await req.json().catch(() => ({}))) ?? {}) as PostBody;
  const hospitalInputs = normalizeHospitals(body.hospitals);
  const selectedDepartments = asStringArray(body.selectedDepartments);
  if (hospitalInputs.length === 0) {
    return NextResponse.json({ message: "依頼先病院を選択してください。" }, { status: 400 });
  }

  await ensureCasesColumns();
  await ensureHospitalRequestTables();

  const resolvedCase = await resolveCaseByAnyId(caseId);
  if (!resolvedCase || resolvedCase.mode !== user.currentMode) {
    return NextResponse.json({ message: "対象事案が見つかりません。" }, { status: 404 });
  }
  const flow = resolveDispatchSelectionFlow(resolvedCase.casePayload);
  if (!flow) {
    return NextResponse.json({ message: "本部管理の選定依頼以外には受入依頼を送信できません。" }, { status: 400 });
  }

  const hospitals = await resolveDispatchHospitals(hospitalInputs, selectedDepartments);
  if (hospitals.length === 0) {
    return NextResponse.json({ message: "選択した病院をマスタから解決できませんでした。" }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await insertDispatchHospitalRequests(client, {
      caseId: resolvedCase.caseId,
      caseUid: resolvedCase.caseUid,
      mode: resolvedCase.mode,
      teamId: resolvedCase.caseTeamId,
      casePayload: resolvedCase.casePayload,
      actorId: user.id,
      hospitals,
      flow,
      selectedDepartments,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("POST /api/dispatch/cases/[caseId]/hospital-requests failed", error);
    return NextResponse.json({ message: "受入依頼の送信に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, rows: await listDispatchHospitalRequests(resolvedCase.caseId, user.currentMode) });
}
