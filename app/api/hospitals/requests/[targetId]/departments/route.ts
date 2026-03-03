import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type Params = {
  params: Promise<{ targetId: string }>;
};

type Body = {
  selectedDepartments?: unknown;
};

type TargetRow = {
  id: number;
  hospital_id: number;
};

type DepartmentRow = {
  name: string;
  short_name: string;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    await ensureHospitalRequestTables();
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const requestedDepartments = Array.isArray(body?.selectedDepartments) ? body.selectedDepartments : null;
    if (!requestedDepartments) {
      return NextResponse.json({ message: "selectedDepartments must be an array." }, { status: 400 });
    }

    const targetRes = await db.query<TargetRow>(
      `
        SELECT id, hospital_id
        FROM hospital_request_targets
        WHERE id = $1
        LIMIT 1
      `,
      [targetId],
    );
    const target = targetRes.rows[0];
    if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (target.hospital_id !== user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const normalizedKeys = Array.from(
      new Set(
        requestedDepartments
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    );

    const deptRes = await db.query<DepartmentRow>(
      `
        SELECT name, short_name
        FROM medical_departments
      `,
    );
    const shortNameByKey = new Map<string, string>();
    const nameByShortName = new Map<string, string>();
    for (const dept of deptRes.rows) {
      shortNameByKey.set(dept.short_name, dept.short_name);
      shortNameByKey.set(dept.name, dept.short_name);
      nameByShortName.set(dept.short_name, dept.name);
    }

    const selectedDepartmentShortNames = normalizedKeys.map((key) => shortNameByKey.get(key)).filter(
      (v): v is string => Boolean(v),
    );
    if (selectedDepartmentShortNames.length !== normalizedKeys.length) {
      return NextResponse.json({ message: "Unknown department was included." }, { status: 400 });
    }

    await db.query(
      `
        UPDATE hospital_request_targets
        SET selected_departments = $2::jsonb,
            updated_by_user_id = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [targetId, JSON.stringify(selectedDepartmentShortNames), user.id],
    );

    return NextResponse.json({
      ok: true,
      selectedDepartmentShortNames,
      selectedDepartments: selectedDepartmentShortNames.map((key) => nameByShortName.get(key) ?? key),
    });
  } catch (error) {
    console.error("PATCH /api/hospitals/requests/[targetId]/departments failed", error);
    return NextResponse.json({ message: "Failed to update departments." }, { status: 500 });
  }
}
