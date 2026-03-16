import { db } from "@/lib/db";
import type {
  HospitalDashboardSettings,
  HospitalDisplaySettings,
  HospitalFacilityEditableSettings,
  HospitalNotificationSettings,
  HospitalOperationsSettings,
} from "@/lib/hospitalSettingsValidation";

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

export type HospitalNotificationEditableSettings = {
  notifyNewRequest: boolean;
  notifyReplyArrival: boolean;
  notifyTransportDecided: boolean;
  notifyTransportDeclined: boolean;
  notifyRepeat: boolean;
  notifyReplyDelay: boolean;
  replyDelayMinutes: 10 | 15 | 20;
};

export type HospitalDisplayEditableSettings = {
  displayDensity: "standard" | "comfortable" | "compact";
  defaultSort: "updated" | "received" | "priority";
};

export type HospitalDashboardEditableSettings = {
  responseTargetMinutes: number;
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

export function getDefaultHospitalNotificationSettings(): HospitalNotificationSettings {
  return {
    notifyNewRequest: true,
    notifyReplyArrival: true,
    notifyTransportDecided: true,
    notifyTransportDeclined: true,
    notifyRepeat: false,
    notifyReplyDelay: true,
    replyDelayMinutes: 10,
  };
}

export function getDefaultHospitalDisplaySettings(): HospitalDisplaySettings {
  return {
    displayDensity: "standard",
    defaultSort: "updated",
  };
}

export function getDefaultHospitalDashboardSettings(): HospitalDashboardSettings {
  return {
    responseTargetMinutes: 15,
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
    notify_new_request: boolean | null;
    notify_reply_arrival: boolean | null;
    notify_transport_decided: boolean | null;
    notify_transport_declined: boolean | null;
    notify_repeat: boolean | null;
    notify_reply_delay: boolean | null;
    reply_delay_minutes: number | null;
    display_density: "standard" | "comfortable" | "compact" | null;
    default_sort: "updated" | "received" | "priority" | null;
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
        hs.decline_template,
        hs.notify_new_request,
        hs.notify_reply_arrival,
        hs.notify_transport_decided,
        hs.notify_transport_declined,
        hs.notify_repeat,
        hs.notify_reply_delay,
        hs.reply_delay_minutes,
        hs.display_density,
        hs.default_sort
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
    hospitalName: row.hospital_name || "???",
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

export async function getHospitalNotificationSettings(hospitalId: number): Promise<HospitalNotificationEditableSettings> {
  const result = await db.query<{
    notify_new_request: boolean | null;
    notify_reply_arrival: boolean | null;
    notify_transport_decided: boolean | null;
    notify_transport_declined: boolean | null;
    notify_repeat: boolean | null;
    notify_reply_delay: boolean | null;
    reply_delay_minutes: number | null;
  }>(
    `
      SELECT
        notify_new_request,
        notify_reply_arrival,
        notify_transport_decided,
        notify_transport_declined,
        notify_repeat,
        notify_reply_delay,
        reply_delay_minutes
      FROM hospital_settings
      WHERE hospital_id = $1
      LIMIT 1
    `,
    [hospitalId],
  );

  const row = result.rows[0];
  const defaults = getDefaultHospitalNotificationSettings();

  return {
    notifyNewRequest: row?.notify_new_request ?? defaults.notifyNewRequest,
    notifyReplyArrival: row?.notify_reply_arrival ?? defaults.notifyReplyArrival,
    notifyTransportDecided: row?.notify_transport_decided ?? defaults.notifyTransportDecided,
    notifyTransportDeclined: row?.notify_transport_declined ?? defaults.notifyTransportDeclined,
    notifyRepeat: row?.notify_repeat ?? defaults.notifyRepeat,
    notifyReplyDelay: row?.notify_reply_delay ?? defaults.notifyReplyDelay,
    replyDelayMinutes: (row?.reply_delay_minutes as 10 | 15 | 20 | null) ?? defaults.replyDelayMinutes,
  };
}

export async function updateHospitalNotificationSettings(
  hospitalId: number,
  patch: HospitalNotificationSettings,
): Promise<HospitalNotificationEditableSettings> {
  await ensureHospitalSettingsRow(hospitalId);

  await db.query(
    `
      UPDATE hospital_settings
      SET
        notify_new_request = $2,
        notify_reply_arrival = $3,
        notify_transport_decided = $4,
        notify_transport_declined = $5,
        notify_repeat = $6,
        notify_reply_delay = $7,
        reply_delay_minutes = $8,
        updated_at = NOW()
      WHERE hospital_id = $1
    `,
    [
      hospitalId,
      patch.notifyNewRequest,
      patch.notifyReplyArrival,
      patch.notifyTransportDecided,
      patch.notifyTransportDeclined,
      patch.notifyRepeat,
      patch.notifyReplyDelay,
      patch.replyDelayMinutes,
    ],
  );

  return getHospitalNotificationSettings(hospitalId);
}

export async function getHospitalDisplaySettings(hospitalId: number): Promise<HospitalDisplayEditableSettings> {
  const result = await db.query<{
    display_density: "standard" | "comfortable" | "compact" | null;
    default_sort: "updated" | "received" | "priority" | null;
  }>(
    `
      SELECT display_density, default_sort
      FROM hospital_settings
      WHERE hospital_id = $1
      LIMIT 1
    `,
    [hospitalId],
  );

  const row = result.rows[0];
  const defaults = getDefaultHospitalDisplaySettings();

  return {
    displayDensity: row?.display_density ?? defaults.displayDensity,
    defaultSort: row?.default_sort ?? defaults.defaultSort,
  };
}

export async function updateHospitalDisplaySettings(
  hospitalId: number,
  patch: HospitalDisplaySettings,
): Promise<HospitalDisplayEditableSettings> {
  await ensureHospitalSettingsRow(hospitalId);

  await db.query(
    `
      UPDATE hospital_settings
      SET
        display_density = $2,
        default_sort = $3,
        updated_at = NOW()
      WHERE hospital_id = $1
    `,
    [hospitalId, patch.displayDensity, patch.defaultSort],
  );

  return getHospitalDisplaySettings(hospitalId);
}

export async function getHospitalDashboardSettings(hospitalId: number): Promise<HospitalDashboardEditableSettings> {
  const result = await db.query<{
    response_target_minutes: number | null;
  }>(
    `
      SELECT response_target_minutes
      FROM hospital_settings
      WHERE hospital_id = $1
      LIMIT 1
    `,
    [hospitalId],
  );

  const row = result.rows[0];
  const defaults = getDefaultHospitalDashboardSettings();

  return {
    responseTargetMinutes: row?.response_target_minutes ?? defaults.responseTargetMinutes,
  };
}

export async function updateHospitalDashboardSettings(
  hospitalId: number,
  patch: HospitalDashboardSettings,
): Promise<HospitalDashboardEditableSettings> {
  await ensureHospitalSettingsRow(hospitalId);

  await db.query(
    `
      UPDATE hospital_settings
      SET
        response_target_minutes = $2,
        updated_at = NOW()
      WHERE hospital_id = $1
    `,
    [hospitalId, patch.responseTargetMinutes],
  );

  return getHospitalDashboardSettings(hospitalId);
}
