import { NextResponse } from "next/server";

import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type SendHistoryItem = {
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: string;
  patientSummary?: unknown;
  hospitalCount: number;
  hospitalNames: string[];
  hospitals?: Array<{
    hospitalId: number;
    hospitalName: string;
    address?: string;
    phone?: string;
    departments?: string[];
    distanceKm?: number | null;
  }>;
  searchMode?: "or" | "and";
  selectedDepartments?: string[];
};

type PostBody = {
  caseId: string;
  item: SendHistoryItem;
};

type DbHospital = {
  id: number;
  source_no: number;
  name: string;
};

type CreatedTarget = {
  id: number;
};

type RequestStatusAggregate = {
  request_id: string;
  has_unread: boolean;
  has_read: boolean;
  has_negotiating: boolean;
  has_acceptable: boolean;
  has_not_acceptable: boolean;
  has_transport_decided: boolean;
  has_transport_declined: boolean;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readSendHistory(value: unknown): SendHistoryItem[] {
  const payload = asObject(value);
  const history = payload.sendHistory;
  return Array.isArray(history) ? (history as SendHistoryItem[]) : [];
}

function normalizeDepartments(departments: string[] | undefined, fallback: string[] | undefined): string[] {
  const src = departments && departments.length > 0 ? departments : fallback ?? [];
  return Array.from(new Set(src.map((value) => String(value).trim()).filter(Boolean)));
}

function normalizePatientSummary(value: unknown): Record<string, unknown> {
  const summary = asObject(value);
  if (Object.keys(summary).length > 0) return summary;
  return {};
}

function mapAggregateStatusToHistoryLabel(aggregate: RequestStatusAggregate): string {
  if (aggregate.has_transport_decided) return "搬送先決定";
  if (aggregate.has_transport_declined) return "キャンセル済";
  if (aggregate.has_acceptable) return "受入可能";
  if (aggregate.has_unread && !aggregate.has_read && !aggregate.has_negotiating && !aggregate.has_not_acceptable) {
    return "未読";
  }
  if (aggregate.has_read || aggregate.has_negotiating || aggregate.has_not_acceptable || aggregate.has_unread) {
    return "既読";
  }
  return "未読";
}

function pickPatientSummaryFromCasePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const fromCaseContext = asObject(payload.caseContext);
  if (Object.keys(fromCaseContext).length > 0) return fromCaseContext;

  const fromPatientSummary = asObject(payload.patientSummary);
  if (Object.keys(fromPatientSummary).length > 0) return fromPatientSummary;

  const basic = asObject(payload.basic);
  const summary = asObject(payload.summary);
  const findings = asObject(payload.findings);
  const vitals = Array.isArray(payload.vitals) ? payload.vitals : [];

  // Preferred shape from case editor persistence (`basic` / `summary` / `vitals`).
  if (Object.keys(basic).length > 0 || Object.keys(summary).length > 0 || vitals.length > 0) {
    const merged: Record<string, unknown> = {
      caseId: basic.caseId ?? payload.caseId,
      name: basic.nameUnknown ? "不明" : basic.name,
      age: basic.calculatedAge ?? basic.age,
      teamCode: basic.teamCode,
      teamName: basic.teamName,
      address: basic.address,
      phone: basic.phone,
      gender: basic.gender,
      adl: basic.adl,
      allergy: basic.allergy,
      weight: basic.weight,
      relatedPeople: Array.isArray(basic.relatedPeople) ? basic.relatedPeople : [],
      pastHistories: Array.isArray(basic.pastHistories) ? basic.pastHistories : [],
      chiefComplaint: summary.chiefComplaint,
      dispatchSummary: summary.dispatchSummary,
      vitals,
      changedFindings: Array.isArray(payload.changedFindings)
        ? payload.changedFindings
        : Array.isArray(findings.changedFindings)
          ? findings.changedFindings
          : [],
      updatedAt: new Date().toISOString(),
    };
    return merged;
  }

  // Fallback: keep only known patient-summary fields from case payload.
  const keys = [
    "caseId",
    "name",
    "age",
    "address",
    "phone",
    "gender",
    "birthSummary",
    "adl",
    "allergy",
    "weight",
    "relatedPeople",
    "pastHistories",
    "chiefComplaint",
    "dispatchSummary",
    "vitals",
    "changedFindings",
    "updatedAt",
  ] as const;

  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (payload[key] !== undefined) {
      picked[key] = payload[key];
    }
  }
  return picked;
}

async function persistHospitalRequests(caseId: string, item: SendHistoryItem) {
  await ensureHospitalRequestTables();
  const hospitals = item.hospitals ?? [];
  const fallbackHospitalNames = item.hospitalNames ?? [];
  if (hospitals.length === 0 && fallbackHospitalNames.length === 0) return;

  const user = await getAuthenticatedUser();
  const patientSummary = normalizePatientSummary(item.patientSummary);
  let resolvedFromTeamId: number | null = user?.teamId ?? null;

  if (!resolvedFromTeamId) {
    const teamCode = String(patientSummary.teamCode ?? "").trim();
    const teamName = String(patientSummary.teamName ?? "").trim();
    if (teamCode || teamName) {
      const teamRes = await db.query<{ id: number }>(
        `
          SELECT id
          FROM emergency_teams
          WHERE ($1 <> '' AND team_code = $1)
             OR ($2 <> '' AND team_name = $2)
          ORDER BY id ASC
          LIMIT 1
        `,
        [teamCode, teamName],
      );
      resolvedFromTeamId = teamRes.rows[0]?.id ?? null;
    }
  }
  const sentAt = new Date(item.sentAt);
  const normalizedSentAt = Number.isNaN(sentAt.getTime()) ? new Date() : sentAt;

  const requestTargets = (
    hospitals.length > 0
      ? hospitals.map((hospital) => ({
          sourceNo: Number(hospital.hospitalId),
          hospitalName: String(hospital.hospitalName ?? "").trim(),
          departments: normalizeDepartments(hospital.departments, item.selectedDepartments),
        }))
      : fallbackHospitalNames.map((hospitalName) => ({
          sourceNo: Number.NaN,
          hospitalName: String(hospitalName ?? "").trim(),
          departments: normalizeDepartments(undefined, item.selectedDepartments),
        }))
  ).filter((hospital) => Number.isFinite(hospital.sourceNo) || hospital.hospitalName);

  if (requestTargets.length === 0) return;

  const sourceNos = requestTargets.map((v) => v.sourceNo).filter((v) => Number.isFinite(v));
  const names = requestTargets.map((v) => v.hospitalName).filter(Boolean);

  const foundHospitals = await db.query<DbHospital>(
    `
      SELECT id, source_no, name
      FROM hospitals
      WHERE (array_length($1::int[], 1) IS NOT NULL AND source_no = ANY($1::int[]))
         OR (array_length($2::text[], 1) IS NOT NULL AND name = ANY($2::text[]))
    `,
    [sourceNos.length > 0 ? sourceNos : null, names.length > 0 ? names : null],
  );

  const bySourceNo = new Map<number, DbHospital>();
  const byName = new Map<string, DbHospital>();
  for (const hospital of foundHospitals.rows) {
    bySourceNo.set(hospital.source_no, hospital);
    byName.set(hospital.name, hospital);
  }

  const resolvedTargets: Array<{ hospital: DbHospital; departments: string[] }> = [];
  for (const target of requestTargets) {
    const hospital = bySourceNo.get(target.sourceNo) ?? byName.get(target.hospitalName) ?? null;
    if (!hospital) continue;
    resolvedTargets.push({
      hospital,
      departments: target.departments,
    });
  }

  if (resolvedTargets.length === 0) return;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const requestRes = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_requests (
        request_id, case_id, patient_summary, from_team_id, created_by_user_id, sent_at, updated_at
        ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, NOW())
        ON CONFLICT (request_id)
        DO UPDATE SET
          case_id = EXCLUDED.case_id,
          patient_summary = EXCLUDED.patient_summary,
          from_team_id = EXCLUDED.from_team_id,
          created_by_user_id = EXCLUDED.created_by_user_id,
          sent_at = EXCLUDED.sent_at,
          updated_at = NOW()
        RETURNING id
      `,
      [
        item.requestId,
        caseId,
        JSON.stringify(patientSummary),
        resolvedFromTeamId,
        user?.id ?? null,
        normalizedSentAt.toISOString(),
      ],
    );

    const requestPk = requestRes.rows[0]?.id;
    if (!requestPk) {
      throw new Error("failed to create hospital_requests row");
    }

    for (const target of resolvedTargets) {
      const targetRes = await client.query<CreatedTarget>(
        `
          INSERT INTO hospital_request_targets (
            hospital_request_id,
            hospital_id,
            status,
            selected_departments,
            updated_by_user_id,
            updated_at
          ) VALUES ($1, $2, 'UNREAD', $3::jsonb, $4, NOW())
          ON CONFLICT (hospital_request_id, hospital_id)
          DO UPDATE SET
            selected_departments = EXCLUDED.selected_departments,
            updated_by_user_id = EXCLUDED.updated_by_user_id,
            updated_at = NOW()
          RETURNING id
        `,
        [requestPk, target.hospital.id, JSON.stringify(target.departments), user?.id ?? null],
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
            acted_at
          ) VALUES ($1, 'sent', NULL, 'UNREAD', $2, NOW())
        `,
        [targetId, user?.id ?? null],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function GET(req: Request) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();
    const { searchParams } = new URL(req.url);
    const caseId = (searchParams.get("caseId") ?? "").trim();
    if (!caseId) {
      return NextResponse.json({ message: "caseId is required." }, { status: 400 });
    }

    const res = await db.query<{ case_payload: unknown }>(
      `
      SELECT case_payload
      FROM cases
      WHERE case_id = $1
      LIMIT 1
      `,
      [caseId],
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ rows: [] as SendHistoryItem[] });
    }

    const rows = readSendHistory(res.rows[0].case_payload).sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
    if (rows.length === 0) {
      return NextResponse.json({ rows });
    }

    const requestIds = Array.from(new Set(rows.map((row) => String(row.requestId ?? "").trim()).filter(Boolean)));
    if (requestIds.length === 0) {
      return NextResponse.json({ rows });
    }

    const statusRes = await db.query<RequestStatusAggregate>(
      `
      SELECT
        r.request_id,
        BOOL_OR(t.status = 'UNREAD') AS has_unread,
        BOOL_OR(t.status = 'READ') AS has_read,
        BOOL_OR(t.status = 'NEGOTIATING') AS has_negotiating,
        BOOL_OR(t.status = 'ACCEPTABLE') AS has_acceptable,
        BOOL_OR(t.status = 'NOT_ACCEPTABLE') AS has_not_acceptable,
        BOOL_OR(t.status = 'TRANSPORT_DECIDED') AS has_transport_decided,
        BOOL_OR(t.status = 'TRANSPORT_DECLINED') AS has_transport_declined
      FROM hospital_requests r
      INNER JOIN hospital_request_targets t ON t.hospital_request_id = r.id
      WHERE r.case_id = $1
        AND r.request_id = ANY($2::text[])
      GROUP BY r.request_id
      `,
      [caseId, requestIds],
    );

    const statusMap = new Map<string, string>();
    for (const aggregate of statusRes.rows) {
      statusMap.set(aggregate.request_id, mapAggregateStatusToHistoryLabel(aggregate));
    }

    const mergedRows = rows.map((row) => ({
      ...row,
      status: statusMap.get(row.requestId) ?? row.status ?? "未読",
    }));

    return NextResponse.json({ rows: mergedRows });
  } catch (e) {
    console.error("GET /api/cases/send-history failed", e);
    return NextResponse.json({ message: "送信履歴の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureCasesColumns();
    const body = (await req.json()) as PostBody;
    const caseId = (body.caseId ?? "").trim();
    const item = body.item;

    if (!caseId || !item?.requestId || !item?.sentAt) {
      return NextResponse.json({ message: "caseId and item are required." }, { status: 400 });
    }

    const target = await db.query<{ case_payload: unknown }>(
      `
      SELECT case_payload
      FROM cases
      WHERE case_id = $1
      LIMIT 1
      `,
      [caseId],
    );

    if (target.rows.length === 0) {
      return NextResponse.json({ message: "対象事案が見つかりません。" }, { status: 404 });
    }

    const prevPayload = asObject(target.rows[0].case_payload);
    const prevHistory = readSendHistory(prevPayload);
    const fallbackSummary = pickPatientSummaryFromCasePayload(prevPayload);
    const normalizedItem: SendHistoryItem = {
      ...item,
      patientSummary: normalizePatientSummary(item.patientSummary ?? fallbackSummary),
      status: item.status ?? "未読",
    };
    const nextHistory = [normalizedItem, ...prevHistory.filter((v) => v.requestId !== item.requestId)].slice(0, 300);
    const nextPayload = { ...prevPayload, sendHistory: nextHistory };

    await db.query(
      `
      UPDATE cases
      SET case_payload = $2::jsonb, updated_at = NOW()
      WHERE case_id = $1
      `,
      [caseId, JSON.stringify(nextPayload)],
    );

    try {
      await persistHospitalRequests(caseId, normalizedItem);
    } catch (persistError) {
      console.error("persistHospitalRequests failed", persistError);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/cases/send-history failed", e);
    return NextResponse.json({ message: "送信履歴の保存に失敗しました。" }, { status: 500 });
  }
}
