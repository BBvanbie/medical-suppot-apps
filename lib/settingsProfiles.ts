import { cache } from "react";

import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";

export type EmsSettingsProfile = {
  username: string;
  displayName: string;
  role: "EMS";
  teamId: number | null;
  teamCode: string;
  teamName: string;
  division: string;
  lastLoginAt: string | null;
};

export type HospitalSettingsProfile = {
  username: string;
  displayName: string;
  role: "HOSPITAL";
  hospitalId: number | null;
  hospitalName: string;
  facilityCode: string;
  municipality: string;
  address: string;
  phone: string;
  lastLoginAt: string | null;
};

function formatDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export const getEmsSettingsProfile = cache(async (): Promise<EmsSettingsProfile | null> => {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "EMS") return null;

  const result = await db.query<{
    username: string;
    display_name: string | null;
    team_id: number | null;
    team_code: string | null;
    team_name: string | null;
    division: string | null;
    last_login_at: Date | string | null;
  }>(
    `
      SELECT
        u.username,
        u.display_name,
        u.team_id,
        et.team_code,
        et.team_name,
        et.division,
        u.last_login_at
      FROM users u
      LEFT JOIN emergency_teams et ON et.id = u.team_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [user.id],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    username: row.username,
    displayName: row.display_name || row.username,
    role: "EMS",
    teamId: row.team_id,
    teamCode: row.team_code || "-",
    teamName: row.team_name || "未設定",
    division: row.division || "-",
    lastLoginAt: formatDateTime(row.last_login_at),
  };
});

export const getHospitalSettingsProfile = cache(async (): Promise<HospitalSettingsProfile | null> => {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL") return null;

  const result = await db.query<{
    username: string;
    display_name: string | null;
    hospital_id: number | null;
    hospital_name: string | null;
    source_no: number | null;
    municipality: string | null;
    address: string | null;
    phone: string | null;
    last_login_at: Date | string | null;
  }>(
    `
      SELECT
        u.username,
        u.display_name,
        u.hospital_id,
        h.name AS hospital_name,
        h.source_no,
        h.municipality,
        h.address,
        h.phone,
        u.last_login_at
      FROM users u
      LEFT JOIN hospitals h ON h.id = u.hospital_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [user.id],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    username: row.username,
    displayName: row.display_name || row.username,
    role: "HOSPITAL",
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name || "未設定",
    facilityCode: row.source_no != null ? `H-${row.source_no}` : "-",
    municipality: row.municipality || "",
    address: row.address || "",
    phone: row.phone || "",
    lastLoginAt: formatDateTime(row.last_login_at),
  };
});
