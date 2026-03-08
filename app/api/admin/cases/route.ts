import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type AdminCaseListRow = {
  case_id: string;
  aware_date: string;
  aware_time: string;
  address: string;
  team_name: string | null;
  patient_name: string;
  age: number | null;
  gender: string | null;
  destination: string | null;
  decided_hospital_name: string | null;
  incident_status: "選定前" | "選定中" | "搬送決定";
};

export async function GET() {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const result = await db.query<AdminCaseListRow>(
      `
        SELECT
          c.case_id,
          c.aware_date,
          c.aware_time,
          c.address,
          et.team_name,
          c.patient_name,
          c.age,
          c.case_payload->'basic'->>'gender' AS gender,
          c.destination,
          decided_hospital.hospital_name AS decided_hospital_name,
          CASE
            WHEN req_summary.has_transport_decided THEN '搬送決定'
            WHEN req_summary.request_target_count > 0 THEN '選定中'
            ELSE '選定前'
          END AS incident_status
        FROM cases c
        LEFT JOIN emergency_teams et ON et.id = c.team_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS request_target_count,
            bool_or(t.status = 'TRANSPORT_DECIDED') AS has_transport_decided
          FROM hospital_requests r
          JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          WHERE r.case_id = c.case_id
        ) req_summary ON TRUE
        LEFT JOIN LATERAL (
          SELECT h.name AS hospital_name
          FROM hospital_requests r
          JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          JOIN hospitals h ON h.id = t.hospital_id
          WHERE r.case_id = c.case_id
            AND t.status = 'TRANSPORT_DECIDED'
          ORDER BY t.updated_at DESC, t.id DESC
          LIMIT 1
        ) decided_hospital ON TRUE
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT 300
      `,
    );

    return NextResponse.json({
      rows: result.rows.map((row) => ({
        caseId: row.case_id,
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
    });
  } catch (error) {
    console.error("GET /api/admin/cases failed", error);
    return NextResponse.json({ message: "事案一覧の取得に失敗しました。" }, { status: 500 });
  }
}
