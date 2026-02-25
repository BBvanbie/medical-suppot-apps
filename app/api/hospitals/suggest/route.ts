import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type Row = {
  name: string;
};

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q) {
      return NextResponse.json({ hospitals: [] });
    }

    const result = await db.query<Row>(
      `
      SELECT name
      FROM hospitals
      WHERE name ILIKE $1
      ORDER BY name ASC
      LIMIT 10
      `,
      [`%${q}%`],
    );

    return NextResponse.json({
      hospitals: result.rows.map((r: Row) => r.name),
    });
  } catch {
    return NextResponse.json({ hospitals: [] }, { status: 500 });
  }
}
