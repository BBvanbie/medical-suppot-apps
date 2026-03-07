import { db } from "@/lib/db";
import type { HospitalFacilityEditableSettings } from "@/lib/hospitalSettingsValidation";

export type HospitalFacilitySettings = {
  hospitalName: string;
  facilityCode: string;
  address: string;
  primaryPhone: string;
  displayContact: string;
  facilityNote: string;
};

export function getDefaultHospitalFacilityEditableSettings(): HospitalFacilityEditableSettings {
  return {
    displayContact: "",
    facilityNote: "",
  };
}

export async function getHospitalFacilitySettings(hospitalId: number): Promise<HospitalFacilitySettings | null> {
  const result = await db.query<{
    hospital_name: string | null;
    source_no: number | null;
    address: string | null;
    phone: string | null;
    display_contact: string | null;
    facility_note: string | null;
  }>(
    `
      SELECT
        h.name AS hospital_name,
        h.source_no,
        h.address,
        h.phone,
        hs.display_contact,
        hs.facility_note
      FROM hospitals h
      LEFT JOIN hospital_settings hs ON hs.hospital_id = h.id
      WHERE h.id = $1
      LIMIT 1
    `,
    [hospitalId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    hospitalName: row.hospital_name || "未設定",
    facilityCode: row.source_no != null ? `H-${row.source_no}` : "-",
    address: row.address || "",
    primaryPhone: row.phone || "",
    displayContact: row.display_contact || "",
    facilityNote: row.facility_note || "",
  };
}

async function ensureHospitalSettingsRow(hospitalId: number) {
  await db.query(
    `
      INSERT INTO hospital_settings (hospital_id)
      VALUES ($1)
      ON CONFLICT (hospital_id) DO NOTHING
    `,
    [hospitalId],
  );
}

export async function updateHospitalFacilitySettings(
  hospitalId: number,
  patch: HospitalFacilityEditableSettings,
): Promise<HospitalFacilitySettings | null> {
  await ensureHospitalSettingsRow(hospitalId);

  await db.query(
    `
      UPDATE hospital_settings
      SET
        display_contact = $2,
        facility_note = $3,
        updated_at = NOW()
      WHERE hospital_id = $1
    `,
    [hospitalId, patch.displayContact, patch.facilityNote],
  );

  return getHospitalFacilitySettings(hospitalId);
}
