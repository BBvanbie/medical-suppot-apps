import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseEditAccess, authorizeCaseReadAccess, authorizeCaseTargetEditAccess, canReadAllCases } from "@/lib/caseAccess";
import { pickPatientSummaryFromCasePayload } from "@/lib/casePatientSummary";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getStatusLabel, isHospitalRequestStatus, type HospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { createNotification } from "@/lib/notifications";
import { updateSendHistoryStatus } from "@/lib/sendHistoryStatusRepository";

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
  caseRef?: string;
  caseId?: string;
  item: SendHistoryItem;
};

type DecisionBody = {
  caseRef?: string;
  caseId?: string;
  requestId?: string;
  targetId?: number;
  status?: HospitalRequestStatus;
  note?: string;
  reasonCode?: string;
  reasonText?: string;
  action?: "DECIDE" | "CONSULT_REPLY";
};

type DbHospital = {
  id: number;
  source_no: number;
  name: string;
};

type CreatedTarget = {
  id: number;
};

type SendHistoryDbRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  case_uid: string;
  sent_at: string;
  status: string;
  hospital_name: string;
  selected_departments: string[] | null;
  consult_comment: string | null;
  ems_reply_comment: string | null;
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
  return Object.keys(summary).length > 0 ? summary : {};
}

type ResolvedCaseRow = {
  case_id: string;
  case_uid: string;
  mode: "LIVE" | "TRAINING";
  case_payload: unknown;
  team_id: number | null;
};

async function resolveCaseByAnyId(caseIdOrUid: string): Promise<ResolvedCaseRow | null> {
  const result = await db.query<ResolvedCaseRow>(
    `
      SELECT case_id, case_uid, mode, case_payload, team_id
      FROM cases
      WHERE case_uid = $1 OR case_id = $1
      ORDER BY CASE WHEN case_uid = $1 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [caseIdOrUid],
  );

  return result.rows[0] ?? null;
}

async function persistHospitalRequests(resolvedCase: ResolvedCaseRow, item: SendHistoryItem) {
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

  const resolvedTargets: Array<{ hospital: DbHospital; departments: string[]; distanceKm: number | null }> = [];
  for (const target of requestTargets) {
    const hospital = bySourceNo.get(target.sourceNo) ?? byName.get(target.hospitalName) ?? null;
    if (!hospital) continue;
    const rawDistance = hospitals.find((h) => Number(h.hospitalId) === Number(target.sourceNo))?.distanceKm;
    const distanceKm = typeof rawDistance === "number" && Number.isFinite(rawDistance) ? rawDistance : null;
    resolvedTargets.push({ hospital, departments: target.departments, distanceKm });
  }

  if (resolvedTargets.length === 0) return;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

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
          sent_at,
          updated_at
) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW())
        ON CONFLICT (request_id)
        DO UPDATE SET
          case_id = EXCLUDED.case_id,
          case_uid = EXCLUDED.case_uid,
          mode = EXCLUDED.mode,
          patient_summary = EXCLUDED.patient_summary,
          from_team_id = EXCLUDED.from_team_id,
          created_by_user_id = EXCLUDED.created_by_user_id,
          sent_at = EXCLUDED.sent_at,
          updated_at = NOW()
        RETURNING id
      `,
      [
        item.requestId,
        resolvedCase.case_id,
        resolvedCase.case_uid,
        resolvedCase.mode,
        JSON.stringify(patientSummary),
        resolvedFromTeamId,
        user?.id ?? null,
        normalizedSentAt.toISOString(),
      ],
    );

    const requestPk = requestRes.rows[0]?.id;
    if (!requestPk) throw new Error("failed to create hospital_requests row");

    for (const target of resolvedTargets) {
      const targetRes = await client.query<CreatedTarget>(
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
          RETURNING id
        `,
        [requestPk, target.hospital.id, JSON.stringify(target.departments), target.distanceKm, user?.id ?? null],
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

      await createNotification(
        {
          audienceRole: "HOSPITAL",
          mode: resolvedCase.mode,
          hospitalId: target.hospital.id,
          kind: "request_received",
          caseId: resolvedCase.case_id,
          caseUid: resolvedCase.case_uid,
          targetId,
          title: "新しい受入要請",
          body: `事案 ${resolvedCase.case_id} の受入要請が届きました。`,
          menuKey: "hospitals-requests",
          dedupeKey: `request-received:${targetId}`,
        },
        client,
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
    const user = await getAuthenticatedUser();

    const { searchParams } = new URL(req.url);
    const caseRef = (searchParams.get("caseRef") ?? searchParams.get("caseId") ?? "").trim();
    if (!caseRef) {
      return NextResponse.json({ message: "caseRef is required. caseId is accepted for backward compatibility." }, { status: 400 });
    }

    const access = await authorizeCaseReadAccess(user, caseRef);
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const actor = user!;
    const resolvedCase = await resolveCaseByAnyId(access.context.caseUid);
    if (!resolvedCase) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const rawTargetId = (searchParams.get("targetId") ?? "").trim();
    const targetId = rawTargetId ? Number(rawTargetId) : null;
    if (rawTargetId && !Number.isFinite(targetId)) {
      return NextResponse.json({ message: "targetId is invalid." }, { status: 400 });
    }

    const values: Array<string | number | null> = [resolvedCase.case_uid, targetId];
    const readScopeSql = canReadAllCases(actor)
      ? ""
      : (() => {
          values.push(actor.teamId);
          return `AND c.team_id = $${values.length}`;
        })();

    const rowsRes = await db.query<SendHistoryDbRow>(
      `
        SELECT
          t.id AS target_id,
          r.request_id,
          r.case_id,
          c.case_uid,
          r.sent_at::text AS sent_at,
          t.status,
          h.name AS hospital_name,
          COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
          consult_event.note AS consult_comment,
          reply_event.note AS ems_reply_comment
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        JOIN cases c ON c.case_uid = r.case_uid
        JOIN hospitals h ON h.id = t.hospital_id
        LEFT JOIN LATERAL (
          SELECT e.note
          FROM hospital_request_events e
          WHERE e.target_id = t.id
            AND e.event_type = 'hospital_response'
            AND e.to_status = 'NEGOTIATING'
            AND e.note IS NOT NULL
            AND btrim(e.note) <> ''
          ORDER BY e.acted_at DESC, e.id DESC
          LIMIT 1
        ) consult_event ON TRUE
        LEFT JOIN LATERAL (
          SELECT e.note
          FROM hospital_request_events e
          WHERE e.target_id = t.id
            AND e.event_type = 'paramedic_consult_reply'
            AND e.note IS NOT NULL
            AND btrim(e.note) <> ''
          ORDER BY e.acted_at DESC, e.id DESC
          LIMIT 1
        ) reply_event ON TRUE
        WHERE r.case_uid = $1
          AND ($2::bigint IS NULL OR t.id = $2::bigint)
          ${readScopeSql}
        ORDER BY r.sent_at DESC, t.id DESC
      `,
      values,
    );

    const rows = rowsRes.rows.map((row) => ({
      targetId: row.target_id,
      requestId: row.request_id,
      caseId: row.case_id,
      caseUid: row.case_uid,
      sentAt: row.sent_at,
      status: isHospitalRequestStatus(row.status) ? getStatusLabel(row.status) : "未読",
      hospitalCount: 1,
      hospitalNames: [row.hospital_name],
      hospitalName: row.hospital_name,
      selectedDepartments: row.selected_departments ?? [],
      consultComment: row.consult_comment ?? "",
      emsReplyComment: row.ems_reply_comment ?? "",
      canDecide: row.status === "ACCEPTABLE",
      canConsult: row.status === "NEGOTIATING",
      rawStatus: row.status,
    }));

    if (targetId) {
      const row = rows[0];
      if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
      return NextResponse.json({ row });
    }

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/cases/send-history failed", error);
    return NextResponse.json({ message: "送信履歴の取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureHospitalRequestTables();
    const body = (await req.json()) as DecisionBody;
    const caseRef = String(body.caseRef ?? body.caseId ?? "").trim();
    const targetId = Number(body.targetId);
    const action = body.action ?? "DECIDE";
    if (!caseRef || !Number.isFinite(targetId)) {
      return NextResponse.json({ message: "caseRef and targetId are required. caseId is accepted for backward compatibility." }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const access = await authorizeCaseTargetEditAccess(user, targetId);
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const actor = user!;
    const target = access.context;

    if (action === "DECIDE" && body.status !== "TRANSPORT_DECIDED" && body.status !== "TRANSPORT_DECLINED") {
      return NextResponse.json({ message: "Invalid decision status." }, { status: 400 });
    }
    if (action === "CONSULT_REPLY" && !String(body.note ?? "").trim()) {
      return NextResponse.json({ message: "Reply note is required." }, { status: 400 });
    }

    if (target.caseId !== caseRef && target.caseUid !== caseRef) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (!isHospitalRequestStatus(target.status)) {
      return NextResponse.json({ message: "Invalid current status" }, { status: 409 });
    }
    if (action === "CONSULT_REPLY" && target.status !== "NEGOTIATING") {
      return NextResponse.json({ message: "Consult reply is allowed only for negotiating status." }, { status: 409 });
    }

    if (action === "DECIDE") {
      const result = await updateSendHistoryStatus({
        targetId: target.targetId,
        nextStatus: body.status!,
        actor,
        note: typeof body.note === "string" ? body.note : null,
        reasonCode: typeof body.reasonCode === "string" ? body.reasonCode : null,
        reasonText: typeof body.reasonText === "string" ? body.reasonText : null,
      });

      if (!result.ok) {
        return NextResponse.json({ message: result.message }, { status: result.status });
      }
      return NextResponse.json(result);
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE hospital_request_targets
          SET updated_by_user_id = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [target.targetId, actor.id],
      );

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
          ) VALUES ($1, 'paramedic_consult_reply', $2, $2, $3, $4, NOW())
        `,
        [target.targetId, target.status, actor.id, String(body.note ?? "").trim()],
      );

      await createNotification(
        {
          audienceRole: "HOSPITAL",
          mode: target.mode,
          hospitalId: target.hospitalId,
          kind: "consult_comment_from_ems",
          caseId: target.caseId,
          caseUid: target.caseUid,
          targetId: target.targetId,
          title: "相談コメント受信",
          body: `事案 ${target.caseId} に救急コメントが届きました。`,
          menuKey: "hospitals-consults",
        },
        client,
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      ok: true,
      status: target.status,
      statusLabel: getStatusLabel(target.status),
      targetId: target.targetId,
    });
  } catch (error) {
    console.error("PATCH /api/cases/send-history failed", error);
    return NextResponse.json({ message: "搬送判断の更新に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureCasesColumns();
    const user = await getAuthenticatedUser();

    const body = (await req.json()) as PostBody;
    const caseRef = (body.caseRef ?? body.caseId ?? "").trim();
    const item = body.item;
    if (!caseRef || !item?.requestId || !item?.sentAt) {
      return NextResponse.json({ message: "caseRef and item are required. caseId is accepted for backward compatibility." }, { status: 400 });
    }

    const access = await authorizeCaseEditAccess(user, caseRef);
    if (!access.ok) {
      if (access.status === 404) {
        return NextResponse.json({ message: "対象事案が見つかりません。" }, { status: 404 });
      }
      return NextResponse.json({ message: access.message }, { status: access.status });
    }
    const resolvedCase = await resolveCaseByAnyId(access.context.caseUid);
    if (!resolvedCase) return NextResponse.json({ message: "対象事案が見つかりません。" }, { status: 404 });

    const prevPayload = asObject(resolvedCase.case_payload);
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
        SET case_payload = $2::jsonb, mode = $3, updated_at = NOW()
        WHERE case_id = $1
      `,
      [resolvedCase.case_id, JSON.stringify(nextPayload), user?.currentMode ?? resolvedCase.mode],
    );

    try {
      await persistHospitalRequests(resolvedCase, normalizedItem);
    } catch (persistError) {
      console.error("persistHospitalRequests failed", persistError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/cases/send-history failed", error);
    return NextResponse.json({ message: "送信履歴の保存に失敗しました。" }, { status: 500 });
  }
}

