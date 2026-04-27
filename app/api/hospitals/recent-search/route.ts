import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { scoreHospitalSearchCandidates } from "@/lib/hospitalSearchScoring";

type SearchMode = "or" | "and";
type SearchType = "recent" | "municipality" | "hospital";

type GeoResponse = Array<{
  geometry?: {
    coordinates?: [number, number];
  };
}>;

type TableRow = {
  hospital_db_id: number;
  hospital_id: number;
  hospital_name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  matched_departments: string[];
};

type HospitalProfileRow = {
  hospital_id: number;
  hospital_name: string;
  address: string;
  phone: string | null;
  available_departments: string[];
};

type DepartmentMasterRow = {
  id: number;
  name: string;
  short_name: string;
};

type CountRow = {
  count: number;
};

function isSearchMode(value: unknown): value is SearchMode {
  return value === "or" || value === "and";
}

function isSearchType(value: unknown): value is SearchType {
  return value === "recent" || value === "municipality" || value === "hospital";
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const query = new URLSearchParams({ q: address });
  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = (await response.json()) as GeoResponse;
  const coordinates = data[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  return {
    longitude: Number(coordinates[0]),
    latitude: Number(coordinates[1]),
  };
}

async function toTableResponse(rows: TableRow[], base: { mode: SearchMode; selectedDepartments: string[] }) {
  const scoredRows = await scoreHospitalSearchCandidates(
    rows.map((row) => ({
      hospitalDbId: row.hospital_db_id,
      hospitalId: row.hospital_id,
      hospitalName: row.hospital_name,
      departments: row.matched_departments,
      address: row.address,
      phone: row.phone ?? "",
      distanceKm: null,
    })),
    base.selectedDepartments,
  );

  return {
    viewType: "table" as const,
    rows: scoredRows,
    profiles: [],
    mode: base.mode,
    selectedDepartments: base.selectedDepartments,
  };
}

async function getHospitalSearchMasterDataErrorMessage(): Promise<string | null> {
  const [departmentCountResult, hospitalDepartmentCountResult] = await Promise.all([
    db.query<CountRow>("SELECT COUNT(*)::int AS count FROM medical_departments"),
    db.query<CountRow>("SELECT COUNT(*)::int AS count FROM hospital_departments"),
  ]);

  const departmentCount = departmentCountResult.rows[0]?.count ?? 0;
  const hospitalDepartmentCount = hospitalDepartmentCountResult.rows[0]?.count ?? 0;

  if (departmentCount === 0) {
    return "病院検索の診療科マスタが未投入です。`scripts/setup_departments.sql` を適用してください。";
  }

  if (hospitalDepartmentCount === 0) {
    return "病院検索の病院-診療科紐付けが未投入です。ローカル環境では `scripts/seed_hospital_departments_demo.sql` の投入が必要です。";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    await ensureHospitalRequestTables();

    const body = await request.json();
    const searchType = body.searchType;
    const isTriage = body.triage === true || body.operationalMode === "TRIAGE";

    if (!isSearchType(searchType)) {
      return NextResponse.json({ message: "Invalid search type." }, { status: 400 });
    }

    const masterDataErrorMessage = await getHospitalSearchMasterDataErrorMessage();
    if (masterDataErrorMessage) {
      return NextResponse.json({ message: masterDataErrorMessage }, { status: 503 });
    }

    if (searchType === "municipality") {
      const municipality = String(body.municipality ?? "").trim();
      const mode = body.mode;
      const departmentShortNames = Array.isArray(body.departmentShortNames)
        ? body.departmentShortNames.map((v: unknown) => String(v)).filter((v: string) => v.length > 0)
        : [];

      if (!municipality) {
        return NextResponse.json({ message: "Municipality is required." }, { status: 400 });
      }
      if (!isSearchMode(mode)) {
        return NextResponse.json({ message: "Invalid search mode." }, { status: 400 });
      }
      if (!isTriage && departmentShortNames.length === 0) {
        return NextResponse.json({ message: "At least one department is required." }, { status: 400 });
      }

      const params: unknown[] = [municipality];
      let sql = `
        SELECT
          h.id AS hospital_db_id,
          h.source_no AS hospital_id,
          h.name AS hospital_name,
          h.address,
          h.phone,
          h.latitude,
          h.longitude,
          COALESCE(
            ARRAY_AGG(DISTINCT md.short_name ORDER BY md.short_name)
              FILTER (WHERE COALESCE(hda.is_available, hd.department_id IS NOT NULL) AND md.short_name IS NOT NULL),
            '{}'
          ) AS matched_departments
        FROM hospitals h
        JOIN hospital_departments hd ON hd.hospital_id = h.id
        JOIN medical_departments md ON md.id = hd.department_id
        LEFT JOIN hospital_department_availability hda
          ON hda.hospital_id = hd.hospital_id
         AND hda.department_id = hd.department_id
        WHERE h.municipality = $1
      `;

      if (departmentShortNames.length > 0) {
        params.push(departmentShortNames);
        sql += `
          AND md.short_name = ANY($2::text[])
        `;
      }

      sql += `
        GROUP BY h.id, h.source_no, h.name, h.address, h.phone, h.latitude, h.longitude
      `;

      if (mode === "and" && departmentShortNames.length > 0) {
        params.push(departmentShortNames.length);
        sql += " HAVING COUNT(DISTINCT md.short_name) = $3";
      }
      sql += " ORDER BY h.source_no ASC";

      const result = await db.query<TableRow>(sql, params);
      return NextResponse.json(await toTableResponse(result.rows, { mode, selectedDepartments: departmentShortNames }));
    }

    if (searchType === "hospital") {
      const hospitalName = String(body.hospitalName ?? "").trim();
      if (!hospitalName) {
        return NextResponse.json({ message: "Hospital name is required." }, { status: 400 });
      }

      const [hospitalResult, departmentsResult] = await Promise.all([
        db.query<HospitalProfileRow>(
          `
            WITH target_hospital AS (
              SELECT id, source_no, name, address, phone
              FROM hospitals
              WHERE name ILIKE $1
              ORDER BY
                CASE
                  WHEN name = $2 THEN 0
                  WHEN name ILIKE ($2 || '%') THEN 1
                  ELSE 2
                END,
                LENGTH(name) ASC,
                source_no ASC
              LIMIT 1
            )
            SELECT
              th.source_no AS hospital_id,
              th.name AS hospital_name,
              th.address,
              th.phone,
              COALESCE(
                ARRAY_AGG(DISTINCT md.short_name ORDER BY md.short_name)
                  FILTER (WHERE md.short_name IS NOT NULL AND COALESCE(hda.is_available, hd.department_id IS NOT NULL)),
                '{}'
              ) AS available_departments
            FROM target_hospital th
            CROSS JOIN medical_departments md
            LEFT JOIN hospital_departments hd
              ON hd.hospital_id = th.id
             AND hd.department_id = md.id
            LEFT JOIN hospital_department_availability hda
              ON hda.hospital_id = th.id
             AND hda.department_id = md.id
            GROUP BY th.source_no, th.name, th.address, th.phone
          `,
          [`%${hospitalName}%`, hospitalName],
        ),
        db.query<DepartmentMasterRow>("SELECT id, name, short_name FROM medical_departments ORDER BY id ASC"),
      ]);

      const allDepartments = departmentsResult.rows;

      return NextResponse.json({
        viewType: "hospital-cards" as const,
        rows: [],
        profiles: hospitalResult.rows.map((row) => ({
          hospitalId: row.hospital_id,
          hospitalName: row.hospital_name,
          address: row.address,
          phone: row.phone ?? "",
          departments: allDepartments.map((department) => ({
            name: department.name,
            shortName: department.short_name,
            available: row.available_departments.includes(department.short_name),
          })),
        })),
        mode: "or" as const,
        selectedDepartments: [],
      });
    }

    const address = String(body.address ?? "").trim();
    const mode = body.mode;
    const departmentShortNames = Array.isArray(body.departmentShortNames)
      ? body.departmentShortNames.map((v: unknown) => String(v)).filter((v: string) => v.length > 0)
      : [];

    if (!address) {
      return NextResponse.json({ message: "Address is required." }, { status: 400 });
    }
    if (!isSearchMode(mode)) {
      return NextResponse.json({ message: "Invalid search mode." }, { status: 400 });
    }
    if (!isTriage && departmentShortNames.length === 0) {
      return NextResponse.json({ message: "At least one department is required." }, { status: 400 });
    }

    const geocoded = await geocodeAddress(address);
    if (!geocoded) {
      return NextResponse.json({ message: "Failed to geocode address." }, { status: 400 });
    }

    const params: unknown[] = [];
    let sql = `
      SELECT
        h.id AS hospital_db_id,
        h.source_no AS hospital_id,
        h.name AS hospital_name,
        h.address,
        h.phone,
        h.latitude,
        h.longitude,
        COALESCE(
          ARRAY_AGG(DISTINCT md.short_name ORDER BY md.short_name)
            FILTER (WHERE COALESCE(hda.is_available, hd.department_id IS NOT NULL) AND md.short_name IS NOT NULL),
          '{}'
        ) AS matched_departments
      FROM hospitals h
      JOIN hospital_departments hd ON hd.hospital_id = h.id
      JOIN medical_departments md ON md.id = hd.department_id
      LEFT JOIN hospital_department_availability hda
        ON hda.hospital_id = hd.hospital_id
       AND hda.department_id = hd.department_id
      WHERE 1 = 1
      GROUP BY h.id, h.source_no, h.name, h.address, h.phone, h.latitude, h.longitude
    `;

    if (departmentShortNames.length > 0) {
      params.push(departmentShortNames);
      sql = sql.replace("WHERE 1 = 1", "WHERE md.short_name = ANY($1::text[])");
    }

    if (mode === "and" && departmentShortNames.length > 0) {
      params.push(departmentShortNames.length);
      sql += " HAVING COUNT(DISTINCT md.short_name) = $2";
    }

    const result = await db.query<TableRow>(sql, params);
    const scoredRows = await scoreHospitalSearchCandidates(
      result.rows.map((row) => ({
        hospitalDbId: row.hospital_db_id,
        hospitalId: row.hospital_id,
        hospitalName: row.hospital_name,
        departments: row.matched_departments,
        address: row.address,
        phone: row.phone ?? "",
        distanceKm:
          row.latitude != null && row.longitude != null
            ? calcDistanceKm(geocoded.latitude, geocoded.longitude, row.latitude, row.longitude)
            : null,
      })),
      departmentShortNames,
    );

    return NextResponse.json({
      viewType: "table" as const,
      rows: scoredRows,
      profiles: [],
      mode,
      selectedDepartments: departmentShortNames,
    });
  } catch (error) {
    console.error("POST /api/hospitals/recent-search failed", error);
    return NextResponse.json({ message: "Search failed." }, { status: 500 });
  }
}
