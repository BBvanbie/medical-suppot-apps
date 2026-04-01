import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { authorizeAdminRoute } from "@/lib/routeAccess";

type AdminCaseListRow = {
  case_id: string;
  division: string | null;
  aware_date: string;
  aware_time: string;
  address: string;
  team_name: string | null;
  patient_name: string;
  age: number | null;
  gender: string | null;
  destination: string | null;
  decided_hospital_name: string | null;
  incident_status: "未読" | "選定中" | "搬送決定";
};

type DivisionOptionRow = {
  division: string | null;
};

export async function GET(req: Request) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const { searchParams } = new URL(req.url);
    const teamName = (searchParams.get("teamName") ?? "").trim();
    const division = (searchParams.get("division") ?? "").trim();
    const status = (searchParams.get("status") ?? "").trim();

    const values: Array<string | number> = [];
    const where: string[] = [];

    if (teamName) {
      values.push(`%${teamName}%`);
      where.push(`et.team_name ILIKE $${values.length}`);
    }

    if (division) {
      values.push(division);
      where.push(`c.division = $${values.length}`);
    }

    if (status) {
      values.push(status);
      where.push(`req_summary.incident_status = $${values.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const [result, divisionsResult] = await Promise.all([
      db.query<AdminCaseListRow>(
        `
          SELECT
            c.case_id,
            c.division,
            c.aware_date,
            c.aware_time,
            c.address,
            et.team_name,
            c.patient_name,
            c.age,
            c.case_payload->'basic'->>'gender' AS gender,
            c.destination,
            decided_hospital.hospital_name AS decided_hospital_name,
            req_summary.incident_status
          FROM cases c
          LEFT JOIN emergency_teams et ON et.id = c.team_id
          LEFT JOIN LATERAL (
            SELECT
              CASE
                WHEN bool_or(t.status = 'TRANSPORT_DECIDED') THEN '搬送決定'
                WHEN COUNT(*) > 0 THEN '選定中'
                ELSE '未読'
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
          ORDER BY c.updated_at DESC, c.id DESC
          LIMIT 300
        `,
        values,
      ),
      db.query<DivisionOptionRow>(
        `
          SELECT DISTINCT c.division
          FROM cases c
          WHERE c.division IS NOT NULL
            AND c.division <> ''
          ORDER BY c.division
        `,
      ),
    ]);

    return NextResponse.json({
      rows: result.rows.map((row) => ({
        caseId: row.case_id,
        division: row.division ?? "",
        awareDate: row.aware_date,
        awareTime: row.aware_time,
        address: row.address,
        teamName: row.team_name ?? "-",
        name: row.patient_name || "-",
        age: Number.isFinite(row.age) ? row.age : null,
        gender: row.gender ?? "unknown",
        status: row.incident_status,
        destination: row.decided_hospital_name ?? row.destination ?? "-",
      })),
      filterOptions: {
        divisions: divisionsResult.rows
          .map((row) => row.division?.trim() ?? "")
          .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index),
        statuses: ["未読", "選定中", "搬送決定"],
      },
    });
  } catch (error) {
    console.error("GET /api/admin/cases failed", error);
    return NextResponse.json({ message: "事案一覧の取得に失敗しました。" }, { status: 500 });
  }
}
