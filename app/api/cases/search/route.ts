import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { canReadAllCases } from "@/lib/caseAccess";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { authorizeCaseReaderRoute } from "@/lib/routeAccess";
import { consumeRateLimit } from "@/lib/rateLimit";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

type CaseRow = {
  case_id: string;
  case_uid: string;
  division: string;
  aware_date: string;
  aware_time: string;
  address: string;
  patient_name: string;
  age: number;
  destination: string | null;
  decided_hospital_name: string | null;
  gender: string | null;
  incident_status: string | null;
  request_target_count: number | null;
};

export async function GET(req: Request) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const access = authorizeCaseReaderRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;
    const rateLimit = await consumeRateLimit({
      policyName: "search_read",
      routeKey: "api.cases.search.get",
      request: req,
      user,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { message: `検索上限に達しました。${rateLimit.retryAfterSeconds} 秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

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

    values.push(user.currentMode);
    where.push(`c.mode = $${values.length}`);

    values.push(limit);
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const res = await db.query<CaseRow>(
      `
        SELECT
          c.case_id,
          c.case_uid,
          c.division,
          c.aware_date,
          c.aware_time,
          c.address,
          c.patient_name,
          c.age,
          c.destination,
          decided_hospital.hospital_name AS decided_hospital_name,
          c.case_payload->'basic'->>'gender' AS gender,
          req_summary.incident_status,
          req_summary.request_target_count
        FROM cases c
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS request_target_count,
            CASE
              WHEN bool_or(t.status = 'TRANSPORT_DECIDED') THEN 'TRANSPORT_DECIDED'
              WHEN bool_or(t.status = 'NEGOTIATING') THEN 'NEGOTIATING'
              WHEN bool_or(t.status = 'ACCEPTABLE') THEN 'ACCEPTABLE'
              WHEN bool_or(t.status = 'NOT_ACCEPTABLE') THEN 'NOT_ACCEPTABLE'
              WHEN bool_or(t.status = 'READ') THEN 'READ'
              WHEN COUNT(*) > 0 THEN 'UNREAD'
              ELSE 'UNREAD'
            END AS incident_status
          FROM hospital_requests r
          JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          WHERE r.case_uid = c.case_uid
        ) req_summary ON TRUE
        LEFT JOIN LATERAL (
          SELECT h.name AS hospital_name
          FROM hospital_requests r
          JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          JOIN hospitals h ON h.id = t.hospital_id
          WHERE r.case_uid = c.case_uid
            AND t.status = 'TRANSPORT_DECIDED'
          ORDER BY t.updated_at DESC, t.id DESC
          LIMIT 1
        ) decided_hospital ON TRUE
        ${whereSql}
        ORDER BY c.aware_date DESC, c.aware_time DESC, c.updated_at DESC, c.id DESC
        LIMIT $${values.length}
      `,
      values,
    );

    return NextResponse.json({
      rows: res.rows.map((row) => ({
        caseId: row.case_id,
        caseUid: row.case_uid,
        division: row.division,
        awareDate: row.aware_date,
        awareTime: row.aware_time,
        address: row.address,
        name: row.patient_name,
        age: row.age,
        gender: row.gender ?? "unknown",
        destination: row.decided_hospital_name ?? row.destination,
        incidentStatus: row.incident_status ?? "UNREAD",
        requestTargetCount: row.request_target_count ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/cases/search failed", error);
    await recordApiFailureEvent("api.cases.search.get", error);
    return NextResponse.json({ message: "事案一覧の取得に失敗しました。" }, { status: 500 });
  }
}
