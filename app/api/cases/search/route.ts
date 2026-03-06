import { NextResponse } from "next/server";

import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type CaseRow = {
  case_id: string;
  division: string;
  aware_date: string;
  aware_time: string;
  address: string;
  patient_name: string;
  age: number;
  destination: string | null;
  request_targets: Array<{
    targetId: number;
    requestId: string;
    sentAt: string;
    hospitalName: string;
    status: string;
    updatedAt: string;
    lastActor: "A" | "HP" | null;
    selectedDepartments: string[];
    latestHpComment: string | null;
    latestAReply: string | null;
  }> | null;
};

export async function GET(req: Request) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const division = (searchParams.get("division") ?? "").trim();
    const rawLimit = Number(searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 300) : 100;

    const values: Array<string | number> = [];
    const where: string[] = [];

    if (q) {
      values.push(`%${q}%`);
      const idx = values.length;
      where.push(`(
        case_id ILIKE $${idx}
        OR patient_name ILIKE $${idx}
        OR address ILIKE $${idx}
        OR COALESCE(symptom, '') ILIKE $${idx}
      )`);
    }

    if (division) {
      values.push(division);
      where.push(`division = $${values.length}`);
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
        req.targets AS request_targets
      FROM cases c
      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'targetId', t.id,
              'requestId', r.request_id,
              'sentAt', r.sent_at::text,
              'hospitalName', h.name,
              'status', t.status,
              'updatedAt', t.updated_at::text,
              'lastActor', last_event.last_actor,
              'selectedDepartments', COALESCE(t.selected_departments, '[]'::jsonb),
              'latestHpComment', latest_hp.comment,
              'latestAReply', latest_a.reply
            )
            ORDER BY t.updated_at DESC, t.id DESC
          ) AS targets
        FROM hospital_requests r
        JOIN hospital_request_targets t ON t.hospital_request_id = r.id
        JOIN hospitals h ON h.id = t.hospital_id
        LEFT JOIN LATERAL (
          SELECT e.note AS comment
          FROM hospital_request_events e
          WHERE e.target_id = t.id
            AND e.event_type = 'hospital_response'
            AND e.note IS NOT NULL
            AND btrim(e.note) <> ''
          ORDER BY e.acted_at DESC, e.id DESC
          LIMIT 1
        ) latest_hp ON TRUE
        LEFT JOIN LATERAL (
          SELECT e.note AS reply
          FROM hospital_request_events e
          WHERE e.target_id = t.id
            AND e.event_type = 'paramedic_consult_reply'
            AND e.note IS NOT NULL
            AND btrim(e.note) <> ''
          ORDER BY e.acted_at DESC, e.id DESC
          LIMIT 1
        ) latest_a ON TRUE
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
        WHERE r.case_id = c.case_id
      ) req ON TRUE
      ${whereSql}
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT $${values.length}
      `,
      values,
    );

    return NextResponse.json({
      rows: res.rows.map((row: CaseRow) => ({
        caseId: row.case_id,
        division: row.division,
        awareDate: row.aware_date,
        awareTime: row.aware_time,
        address: row.address,
        name: row.patient_name,
        age: row.age,
        destination: row.destination,
        requestTargets: Array.isArray(row.request_targets)
          ? row.request_targets.map((target) => ({
              ...target,
              status: isHospitalRequestStatus(target.status) ? target.status : "UNREAD",
              selectedDepartments: Array.isArray(target.selectedDepartments)
                ? target.selectedDepartments.filter((dept): dept is string => typeof dept === "string")
                : [],
              latestHpComment: target.latestHpComment ?? null,
              latestAReply: target.latestAReply ?? null,
            }))
          : [],
      })),
    });
  } catch (e) {
    console.error("GET /api/cases/search failed", e);
    return NextResponse.json({ message: "事案一覧の取得に失敗しました。" }, { status: 500 });
  }
}

