import { db } from "@/lib/db";
import type { EmsDisplaySettings, EmsInputSettings, EmsNotificationSettings, EmsOperationalMode } from "@/lib/emsSettingsValidation";

type EmsSettingsRow = {
  notify_new_response: boolean;
  notify_consult: boolean;
  notify_accepted: boolean;
  notify_declined: boolean;
  notify_repeat: boolean;
  display_text_size: "standard" | "large" | "xlarge";
  display_density: "standard" | "comfortable" | "compact";
  input_auto_tenkey: boolean;
  input_auto_focus: boolean;
  input_vitals_next: boolean;
  input_required_alert: boolean;
  operational_mode: EmsOperationalMode;
};

export function getDefaultEmsNotificationSettings(): EmsNotificationSettings {
  return {
    notifyNewResponse: true,
    notifyConsult: true,
    notifyAccepted: true,
    notifyDeclined: false,
    notifyRepeat: true,
  };
}

export function getDefaultEmsDisplaySettings(): EmsDisplaySettings {
  return {
    textSize: "standard",
    density: "standard",
  };
}

export function getDefaultEmsInputSettings(): EmsInputSettings {
  return {
    autoTenkey: true,
    autoFocus: true,
    vitalsNext: true,
    requiredAlert: true,
  };
}

export function getDefaultEmsOperationalMode(): EmsOperationalMode {
  return "STANDARD";
}

function mapNotificationSettings(row?: Partial<EmsSettingsRow> | null): EmsNotificationSettings {
  const defaults = getDefaultEmsNotificationSettings();
  return {
    notifyNewResponse: row?.notify_new_response ?? defaults.notifyNewResponse,
    notifyConsult: row?.notify_consult ?? defaults.notifyConsult,
    notifyAccepted: row?.notify_accepted ?? defaults.notifyAccepted,
    notifyDeclined: row?.notify_declined ?? defaults.notifyDeclined,
    notifyRepeat: row?.notify_repeat ?? defaults.notifyRepeat,
  };
}

function mapDisplaySettings(row?: Partial<EmsSettingsRow> | null): EmsDisplaySettings {
  const defaults = getDefaultEmsDisplaySettings();
  return {
    textSize: row?.display_text_size ?? defaults.textSize,
    density: row?.display_density ?? defaults.density,
  };
}

function mapInputSettings(row?: Partial<EmsSettingsRow> | null): EmsInputSettings {
  const defaults = getDefaultEmsInputSettings();
  return {
    autoTenkey: row?.input_auto_tenkey ?? defaults.autoTenkey,
    autoFocus: row?.input_auto_focus ?? defaults.autoFocus,
    vitalsNext: row?.input_vitals_next ?? defaults.vitalsNext,
    requiredAlert: row?.input_required_alert ?? defaults.requiredAlert,
  };
}

function mapOperationalMode(row?: Partial<EmsSettingsRow> | null): EmsOperationalMode {
  return row?.operational_mode ?? getDefaultEmsOperationalMode();
}

async function getSettingsRow(userId: number): Promise<EmsSettingsRow | null> {
  const result = await db.query<EmsSettingsRow>(
    `
      SELECT
        notify_new_response,
        notify_consult,
        notify_accepted,
        notify_declined,
        notify_repeat,
        display_text_size,
        display_density,
        input_auto_tenkey,
        input_auto_focus,
        input_vitals_next,
        input_required_alert,
        operational_mode
      FROM ems_user_settings
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function getEmsNotificationSettings(userId: number): Promise<EmsNotificationSettings> {
  return mapNotificationSettings(await getSettingsRow(userId));
}

export async function getEmsDisplaySettings(userId: number): Promise<EmsDisplaySettings> {
  return mapDisplaySettings(await getSettingsRow(userId));
}

export async function getEmsInputSettings(userId: number): Promise<EmsInputSettings> {
  return mapInputSettings(await getSettingsRow(userId));
}

export async function getEmsOperationalMode(userId: number): Promise<EmsOperationalMode> {
  return mapOperationalMode(await getSettingsRow(userId));
}

async function ensureSettingsRow(userId: number) {
  await db.query(
    `
      INSERT INTO ems_user_settings (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  );
}

export async function updateEmsNotificationSettings(userId: number, patch: EmsNotificationSettings): Promise<EmsNotificationSettings> {
  await ensureSettingsRow(userId);

  const result = await db.query<EmsSettingsRow>(
    `
      UPDATE ems_user_settings
      SET
        notify_new_response = $2,
        notify_consult = $3,
        notify_accepted = $4,
        notify_declined = $5,
        notify_repeat = $6,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        notify_new_response,
        notify_consult,
        notify_accepted,
        notify_declined,
        notify_repeat,
        display_text_size,
        display_density,
        input_auto_tenkey,
        input_auto_focus,
        input_vitals_next,
        input_required_alert,
        operational_mode
    `,
    [userId, patch.notifyNewResponse, patch.notifyConsult, patch.notifyAccepted, patch.notifyDeclined, patch.notifyRepeat],
  );

  return mapNotificationSettings(result.rows[0]);
}

export async function updateEmsDisplaySettings(userId: number, patch: EmsDisplaySettings): Promise<EmsDisplaySettings> {
  await ensureSettingsRow(userId);

  const result = await db.query<EmsSettingsRow>(
    `
      UPDATE ems_user_settings
      SET
        display_text_size = $2,
        display_density = $3,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        notify_new_response,
        notify_consult,
        notify_accepted,
        notify_declined,
        notify_repeat,
        display_text_size,
        display_density,
        input_auto_tenkey,
        input_auto_focus,
        input_vitals_next,
        input_required_alert,
        operational_mode
    `,
    [userId, patch.textSize, patch.density],
  );

  return mapDisplaySettings(result.rows[0]);
}

export async function updateEmsInputSettings(userId: number, patch: EmsInputSettings): Promise<EmsInputSettings> {
  await ensureSettingsRow(userId);

  const result = await db.query<EmsSettingsRow>(
    `
      UPDATE ems_user_settings
      SET
        input_auto_tenkey = $2,
        input_auto_focus = $3,
        input_vitals_next = $4,
        input_required_alert = $5,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        notify_new_response,
        notify_consult,
        notify_accepted,
        notify_declined,
        notify_repeat,
        display_text_size,
        display_density,
        input_auto_tenkey,
        input_auto_focus,
        input_vitals_next,
        input_required_alert,
        operational_mode
    `,
    [userId, patch.autoTenkey, patch.autoFocus, patch.vitalsNext, patch.requiredAlert],
  );

  return mapInputSettings(result.rows[0]);
}

export async function updateEmsOperationalMode(userId: number, operationalMode: EmsOperationalMode): Promise<EmsOperationalMode> {
  await ensureSettingsRow(userId);

  const result = await db.query<EmsSettingsRow>(
    `
      UPDATE ems_user_settings
      SET
        operational_mode = $2,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        notify_new_response,
        notify_consult,
        notify_accepted,
        notify_declined,
        notify_repeat,
        display_text_size,
        display_density,
        input_auto_tenkey,
        input_auto_focus,
        input_vitals_next,
        input_required_alert,
        operational_mode
    `,
    [userId, operationalMode],
  );

  return mapOperationalMode(result.rows[0]);
}
