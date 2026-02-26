import { NextResponse } from "next/server";

import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/authContext";

type SendHistoryItem = {
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: string;
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

async function persistHospitalRequests(caseId: string, item: SendHistoryItem) {
  const hospitals = item.hospitals ?? [];
  if (hospitals.length === 0) return;

  const user = await getAuthenticatedUser();
  const sentAt = new Date(item.sentAt);
  const normalizedSentAt = Number.isNaN(sentAt.getTime()) ? new Date() : sentAt;

  const requestTargets = hospitals
    .map((hospital) => ({
      sourceNo: Number(hospital.hospitalId),
      hospitalName: String(hospital.hospitalName ?? "").trim(),
      departments: normalizeDepartments(hospital.departments, item.selectedDepartments),
    }))
    .filter((hospital) => Number.isFinite(hospital.sourceNo) || hospital.hospitalName);

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
          request_id, case_id, from_team_id, created_by_user_id, sent_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (request_id)
        DO UPDATE SET
          case_id = EXCLUDED.case_id,
          from_team_id = EXCLUDED.from_team_id,
          created_by_user_id = EXCLUDED.created_by_user_id,
          sent_at = EXCLUDED.sent_at,
          updated_at = NOW()
        RETURNING id
      `,
      [item.requestId, caseId, user?.teamId ?? null, user?.id ?? null, normalizedSentAt.toISOString()],
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
    return NextResponse.json({ rows });
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
    const normalizedItem: SendHistoryItem = {
      ...item,
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
