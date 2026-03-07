import { db } from "@/lib/db";
import type { HospitalFacilityEditableSettings, HospitalOperationsSettings } from "@/lib/hospitalSettingsValidation";

export type HospitalFacilitySettings = {
  hospitalName: string;
  facilityCode: string;
  address: string;
  primaryPhone: string;
  displayContact: string;
  facilityNote: string;
};

export type HospitalOperationsEditableSettings = {
  consultTemplate: string;
  declineTemplate: string;
};

export function getDefaultHospitalFacilityEditableSettings(): HospitalFacilityEditableSettings {
  return {
    displayContact: "",
    facilityNote: "",
  };
}

export function getDefaultHospitalOperationsSettings(): HospitalOperationsSettings {
  return {
    consultTemplate: "",
    declineTemplate: "",
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
    consult_template: string | null;
    decline_template: string | null;
  }>(
    `
      SELECT
        h.name AS hospital_name,
        h.source_no,
        h.address,
        h.phone,
        hs.display_contact,
        hs.facility_note,
        hs.consult_template,
        hs.decline_template
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

export async function getHospitalOperationsSettings(hospitalId: number): Promise<HospitalOperationsEditableSettings> {
  const result = await db.query<{
    consult_template: string | null;
    decline_template: string | null;
  }>(
    `
      SELECT consult_template, decline_template
      FROM hospital_settings
      WHERE hospital_id = $1
      LIMIT 1
    `,
    [hospitalId],
  );

  const row = result.rows[0];
  const defaults = getDefaultHospitalOperationsSettings();

  return {
    consultTemplate: row?.consult_template ?? defaults.consultTemplate,
    declineTemplate: row?.decline_template ?? defaults.declineTemplate,
  };
}

export async function updateHospitalOperationsSettings(
  hospitalId: number,
  patch: HospitalOperationsSettings,
): Promise<HospitalOperationsEditableSettings> {
  await ensureHospitalSettingsRow(hospitalId);

  await db.query(
    `
      UPDATE hospital_settings
      SET
        consult_template = $2,
        decline_template = $3,
        updated_at = NOW()
      WHERE hospital_id = $1
    `,
    [hospitalId, patch.consultTemplate, patch.declineTemplate],
  );

  return getHospitalOperationsSettings(hospitalId);
}
