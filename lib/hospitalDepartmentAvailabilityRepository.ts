import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

export type HospitalDepartmentAvailabilityItem = {
  departmentId: number;
  departmentName: string;
  departmentShortName: string;
  isAvailable: boolean;
  updatedAt: string | null;
};

type DepartmentAvailabilityRow = {
  department_id: number;
  department_name: string;
  department_short_name: string;
  has_department_assignment: boolean;
  is_available: boolean | null;
  updated_at: string | null;
};

type DepartmentNameRow = {
  name: string;
  short_name: string;
};

export async function listHospitalDepartmentAvailability(hospitalId: number): Promise<HospitalDepartmentAvailabilityItem[]> {
  await ensureHospitalRequestTables();

  const result = await db.query<DepartmentAvailabilityRow>(
    `
      SELECT
        md.id AS department_id,
        md.name AS department_name,
        md.short_name AS department_short_name,
        (hd.department_id IS NOT NULL) AS has_department_assignment,
        hda.is_available,
        hda.updated_at::text AS updated_at
      FROM medical_departments md
      LEFT JOIN hospital_departments hd
        ON hd.hospital_id = $1
       AND hd.department_id = md.id
      LEFT JOIN hospital_department_availability hda
        ON hda.hospital_id = $1
       AND hda.department_id = md.id
      ORDER BY md.id ASC
    `,
    [hospitalId],
  );

  return result.rows.map((row) => ({
    departmentId: row.department_id,
    departmentName: row.department_name,
    departmentShortName: row.department_short_name,
    isAvailable: row.is_available ?? row.has_department_assignment,
    updatedAt: row.updated_at,
  }));
}

export async function updateHospitalDepartmentAvailability(input: {
  hospitalId: number;
  departmentId: number;
  isAvailable: boolean;
}): Promise<HospitalDepartmentAvailabilityItem> {
  await ensureHospitalRequestTables();

  const departmentRes = await db.query<DepartmentNameRow>(
    `
      SELECT name, short_name
      FROM medical_departments
      WHERE id = $1
      LIMIT 1
    `,
    [input.departmentId],
  );

  const department = departmentRes.rows[0];
  if (!department) {
    throw new Error("DEPARTMENT_NOT_FOUND");
  }

  const result = await db.query<{ updated_at: string }>(
    `
      INSERT INTO hospital_department_availability (
        hospital_id,
        department_id,
        is_available,
        updated_at
      ) VALUES ($1, $2, $3, NOW())
      ON CONFLICT (hospital_id, department_id)
      DO UPDATE SET
        is_available = EXCLUDED.is_available,
        updated_at = NOW()
      RETURNING updated_at::text AS updated_at
    `,
    [input.hospitalId, input.departmentId, input.isAvailable],
  );

  return {
    departmentId: input.departmentId,
    departmentName: department.name,
    departmentShortName: department.short_name,
    isAvailable: input.isAvailable,
    updatedAt: result.rows[0]?.updated_at ?? null,
  };
}
