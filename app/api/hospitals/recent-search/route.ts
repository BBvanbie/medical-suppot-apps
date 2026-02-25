import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type SearchMode = "or" | "and";
type SearchType = "recent" | "municipality" | "hospital";

type GeoResponse = Array<{
  geometry?: {
    coordinates?: [number, number];
  };
}>;

type TableRow = {
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
  name: string;
  short_name: string;
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

function toTableResponse(rows: TableRow[], base: { mode: SearchMode; selectedDepartments: string[] }) {
  return {
    viewType: "table" as const,
    rows: rows.map((row) => ({
      hospitalId: row.hospital_id,
      hospitalName: row.hospital_name,
      departments: row.matched_departments,
      address: row.address,
      phone: row.phone ?? "",
      distanceKm: null as number | null,
    })),
    profiles: [],
    mode: base.mode,
    selectedDepartments: base.selectedDepartments,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchType = body.searchType;

    if (!isSearchType(searchType)) {
      return NextResponse.json({ message: "検索種別が不正です。" }, { status: 400 });
    }

    if (searchType === "municipality") {
      const municipality = String(body.municipality ?? "").trim();
      const mode = body.mode;
      const departmentShortNames = Array.isArray(body.departmentShortNames)
        ? body.departmentShortNames.map((v: unknown) => String(v)).filter((v: string) => v.length > 0)
        : [];

      if (!municipality) {
        return NextResponse.json({ message: "市区名を入力してください。" }, { status: 400 });
      }
      if (!isSearchMode(mode)) {
        return NextResponse.json({ message: "検索モードが不正です。" }, { status: 400 });
      }
      if (departmentShortNames.length === 0) {
        return NextResponse.json({ message: "診療科目を1つ以上選択してください。" }, { status: 400 });
      }

      const params: unknown[] = [municipality, departmentShortNames];
      let sql = `
        SELECT
          h.source_no AS hospital_id,
          h.name AS hospital_name,
          h.address,
          h.phone,
          h.latitude,
          h.longitude,
          ARRAY_AGG(DISTINCT md.short_name ORDER BY md.short_name) AS matched_departments
        FROM hospitals h
        JOIN hospital_departments hd ON hd.hospital_id = h.id
        JOIN medical_departments md ON md.id = hd.department_id
        WHERE h.municipality = $1
          AND md.short_name = ANY($2::text[])
        GROUP BY h.source_no, h.name, h.address, h.phone, h.latitude, h.longitude
      `;

      if (mode === "and") {
        params.push(departmentShortNames.length);
        sql += " HAVING COUNT(DISTINCT md.short_name) = $3";
      }
      sql += " ORDER BY h.source_no ASC";

      const result = await db.query<TableRow>(sql, params);
      return NextResponse.json(
        toTableResponse(result.rows, { mode, selectedDepartments: departmentShortNames }),
      );
    }

    if (searchType === "hospital") {
      const hospitalName = String(body.hospitalName ?? "").trim();
      if (!hospitalName) {
        return NextResponse.json({ message: "病院名を入力してください。" }, { status: 400 });
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
            COALESCE(ARRAY_AGG(DISTINCT md.short_name ORDER BY md.short_name) FILTER (WHERE md.short_name IS NOT NULL), '{}') AS available_departments
          FROM target_hospital th
          LEFT JOIN hospital_departments hd ON hd.hospital_id = th.id
          LEFT JOIN medical_departments md ON md.id = hd.department_id
          GROUP BY th.source_no, th.name, th.address, th.phone
          `,
          [`%${hospitalName}%`, hospitalName],
        ),
        db.query<DepartmentMasterRow>("SELECT name, short_name FROM medical_departments ORDER BY id ASC"),
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
      return NextResponse.json({ message: "指令住所を入力してください。" }, { status: 400 });
    }
    if (!isSearchMode(mode)) {
      return NextResponse.json({ message: "検索モードが不正です。" }, { status: 400 });
    }
    if (departmentShortNames.length === 0) {
      return NextResponse.json({ message: "診療科目を1つ以上選択してください。" }, { status: 400 });
    }

    const geocoded = await geocodeAddress(address);
    if (!geocoded) {
      return NextResponse.json({ message: "住所の緯度経度を取得できませんでした。" }, { status: 400 });
    }

    const params: unknown[] = [departmentShortNames];
    let sql = `
      SELECT
        h.source_no AS hospital_id,
        h.name AS hospital_name,
        h.address,
        h.phone,
        h.latitude,
        h.longitude,
        ARRAY_AGG(DISTINCT md.short_name ORDER BY md.short_name) AS matched_departments
      FROM hospitals h
      JOIN hospital_departments hd ON hd.hospital_id = h.id
      JOIN medical_departments md ON md.id = hd.department_id
      WHERE md.short_name = ANY($1::text[])
      GROUP BY h.source_no, h.name, h.address, h.phone, h.latitude, h.longitude
    `;

    if (mode === "and") {
      params.push(departmentShortNames.length);
      sql += " HAVING COUNT(DISTINCT md.short_name) = $2";
    }

    const result = await db.query<TableRow>(sql, params);

    return NextResponse.json({
      viewType: "table" as const,
      rows: result.rows.map((row) => ({
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
      profiles: [],
      mode,
      selectedDepartments: departmentShortNames,
    });
  } catch {
    return NextResponse.json({ message: "検索処理でエラーが発生しました。" }, { status: 500 });
  }
}
