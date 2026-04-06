import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { canReadAllCases } from "@/lib/caseAccess";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { authorizeCaseReaderRoute } from "@/lib/routeAccess";

type ConsultCaseRow = {
  target_id: number;
  case_id: string;
  request_id: string;
  status: string;
  updated_at: string;
  last_actor: "A" | "HP" | null;
  hospital_name: string;
  aware_date: string | null;
  aware_time: string | null;
  dispatch_address: string | null;
  patient_name: string | null;
};

export async function GET() {
  try {
    await ensureHospitalRequestTables();

    const access = authorizeCaseReaderRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;

    const values: Array<number | string | null> = [user.currentMode];
    const where: string[] = ["t.status = 'NEGOTIATING'", "r.mode = $1"];
    if (!canReadAllCases(user)) {
      values.push(user.teamId);
      where.push(`c.team_id = $${values.length}`);
    }

    const res = await db.query<ConsultCaseRow>(
      `
        SELECT
          t.id AS target_id,
          r.case_id,
          r.request_id,
          t.status,
          t.updated_at::text AS updated_at,
          last_event.last_actor,
          h.name AS hospital_name,
          c.aware_date::text AS aware_date,
          c.aware_time::text AS aware_time,
          c.address AS dispatch_address,
          NULLIF(btrim(COALESCE(r.patient_summary->>'name', '')), '') AS patient_name
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        JOIN hospitals h ON h.id = t.hospital_id
        LEFT JOIN cases c ON c.case_uid = r.case_uid
        LEFT JOIN LATERAL (
          SELECT
            CASE
              WHEN e.event_type = 'paramedic_consult_reply' THEN 'A'
              ELSE 'HP'
            END AS last_actor
          FROM hospital_request_events e
          WHERE e.target_id = t.id
            AND (
              (e.event_type = 'hospital_response' AND e.to_status = 'NEGOTIATING')
              OR e.event_type = 'paramedic_consult_reply'
            )
          ORDER BY e.acted_at DESC, e.id DESC
          LIMIT 1
        ) last_event ON TRUE
        WHERE ${where.join(" AND ")}
        ORDER BY t.updated_at DESC, t.id DESC
      `,
      values,
    );

    return NextResponse.json({ rows: res.rows });
  } catch (error) {
    console.error("GET /api/cases/consults failed", error);
    return NextResponse.json({ message: "相談一覧の取得に失敗しました。" }, { status: 500 });
  }
}
