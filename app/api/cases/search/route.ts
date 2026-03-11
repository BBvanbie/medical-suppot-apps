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

function extractMunicipality(address: string | null | undefined): string {
  const normalized = String(address ?? "").trim();
  if (!normalized) return "";

  const prefectures = [
    "\u6771\u4eac\u90fd",
    "\u5317\u6d77\u9053",
    "\u4eac\u90fd\u5e9c",
    "\u5927\u962a\u5e9c",
  ];

  let withoutPrefecture = normalized;
  const exactPrefecture = prefectures.find((prefix) => normalized.startsWith(prefix));
  if (exactPrefecture) {
    withoutPrefecture = normalized.slice(exactPrefecture.length);
  } else {
    withoutPrefecture = normalized.replace(/^.{2,3}\u770c/, "");
  }

  const municipalityPattern = new RegExp(
    "^[^0-9\\uFF10-\\uFF19\\s\\-\\u2212\\u30fc\\u4e01\\u76ee\\u756a\\u5730\\u53f7,\\uFF0C]{1,12}(?:\\u5e02|\\u533a|\\u753a|\\u6751)",
  );
  const match = withoutPrefecture.match(municipalityPattern);
  return match ? match[0] : "";
}

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
              WHEN bool_or(t.status = 'TRANSPORT_DECIDED') THEN 'TRANSPORT_DECIDED'
              WHEN bool_or(t.status = 'ACCEPTABLE') THEN 'ACCEPTABLE'
              WHEN bool_or(t.status = 'NEGOTIATING') THEN 'NEGOTIATING'
              WHEN bool_or(t.status = 'NOT_ACCEPTABLE') THEN 'NOT_ACCEPTABLE'
              WHEN bool_or(t.status = 'READ') THEN 'READ'
              WHEN COUNT(*) > 0 THEN 'UNREAD'
              ELSE 'UNREAD'
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
        municipality: extractMunicipality(row.address),
        name: row.patient_name,
        age: row.age,
        gender: row.gender ?? "unknown",
        destination: row.destination,
        incidentStatus: row.incident_status ?? "UNREAD",
        requestTargetCount: row.request_target_count ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/cases/search failed", error);
    return NextResponse.json({ message: "事案一覧の取得に失敗しました。" }, { status: 500 });
  }
}
