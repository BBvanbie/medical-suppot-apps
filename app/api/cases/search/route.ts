import { NextResponse } from "next/server";

import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";

type CaseRow = {
  case_id: string;
  division: string;
  aware_date: string;
  aware_time: string;
  address: string;
  patient_name: string;
  age: number;
  destination: string | null;
};

export async function GET(req: Request) {
  try {
    await ensureCasesColumns();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const division = (searchParams.get("division") ?? "").trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 300);

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
      SELECT case_id, division, aware_date, aware_time, address, patient_name, age, destination
      FROM cases
      ${whereSql}
      ORDER BY updated_at DESC, id DESC
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
      })),
    });
  } catch (e) {
    console.error("GET /api/cases/search failed", e);
    return NextResponse.json({ message: "事案検索に失敗しました。" }, { status: 500 });
  }
}
