import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { canReadAllCases, isCaseReader } from "@/lib/caseAccess";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type CaseRow = {
  case_id: string;
  division: string;
  aware_date: string;
  aware_time: string;
  address: string;
  patient_name: string;
  age: number;
  destination: string | null;
  gender: string | null;
  incident_status: string | null;
  request_target_count: number | null;
};

export async function GET(req: Request) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isCaseReader(user)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const division = (searchParams.get("division") ?? "").trim();
    const rawLimit = Number(searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 300) : 100;

    const values: Array<string | number | null> = [];
    const where: string[] = [];

    if (q) {
      values.push(`%${q}%`);
      const idx = values.length;
      where.push(`(
        c.case_id ILIKE $${idx}
        OR c.patient_name ILIKE $${idx}
        OR c.address ILIKE $${idx}
        OR COALESCE(c.symptom, '') ILIKE $${idx}
      )`);
    }

    if (division) {
      values.push(division);
      where.push(`c.division = $${values.length}`);
    }

    if (!canReadAllCases(user)) {
      values.push(user.teamId);
      where.push(`c.team_id = $${values.length}`);
    }

    values.push(limit);
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const res = await db.query<CaseRow>(
      `
        SELECT
          c.case_id,
          c.division,
          c.aware_date,
          c.aware_time,
          c.address,
          c.patient_name,
          c.age,
          c.destination,
          c.case_payload->'basic'->>'gender' AS gender,
          req_summary.incident_status,
          req_summary.request_target_count
        FROM cases c
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS request_target_count,
            CASE
              WHEN bool_or(t.status = 'TRANSPORT_DECIDED') THEN '搬送決定'
              WHEN bool_or(t.status = 'ACCEPTABLE') THEN '受入可能あり'
              WHEN bool_or(t.status = 'NEGOTIATING') THEN '要相談'
              WHEN bool_or(t.status = 'NOT_ACCEPTABLE') THEN '受入不可'
              WHEN bool_or(t.status = 'READ') THEN '既読'
              WHEN COUNT(*) > 0 THEN '未読'
              ELSE '未読'
            END AS incident_status
          FROM hospital_requests r
          JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          WHERE r.case_id = c.case_id
        ) req_summary ON TRUE
        ${whereSql}
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT $${values.length}
      `,
      values,
    );

    return NextResponse.json({
      rows: res.rows.map((row) => ({
        caseId: row.case_id,
        division: row.division,
        awareDate: row.aware_date,
        awareTime: row.aware_time,
        address: row.address,
        name: row.patient_name,
        age: row.age,
        gender: row.gender ?? "unknown",
        destination: row.destination,
        incidentStatus: row.incident_status ?? "未読",
        requestTargetCount: row.request_target_count ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/cases/search failed", error);
    return NextResponse.json({ message: "事案一覧の取得に失敗しました。" }, { status: 500 });
  }
}
