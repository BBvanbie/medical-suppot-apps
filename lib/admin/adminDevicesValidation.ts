export type AdminDeviceUpdateInput = {
  deviceName: string;
  roleScope: "EMS" | "HOSPITAL";
  teamId: number | null;
  hospitalId: number | null;
  isActive: boolean;
  isLost: boolean;
};

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  fieldErrors: Record<string, string>;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

export function parseAdminDeviceUpdateInput(value: unknown): ValidationSuccess<AdminDeviceUpdateInput> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const deviceName = normalizeText(raw.deviceName);
  const roleScope = normalizeText(raw.roleScope) as AdminDeviceUpdateInput["roleScope"];
  const teamIdText = normalizeText(raw.teamId);
  const hospitalIdText = normalizeText(raw.hospitalId);
  const teamId = teamIdText ? Number(teamIdText) : null;
  const hospitalId = hospitalIdText ? Number(hospitalIdText) : null;

  if (!deviceName) fieldErrors.deviceName = "端末名は必須です。";
  if (!["EMS", "HOSPITAL"].includes(roleScope)) fieldErrors.roleScope = "端末ロールの値が不正です。";
  if (teamIdText && (teamId == null || !Number.isInteger(teamId) || teamId <= 0)) fieldErrors.teamId = "救急隊の値が不正です。";
  if (hospitalIdText && (hospitalId == null || !Number.isInteger(hospitalId) || hospitalId <= 0)) fieldErrors.hospitalId = "病院の値が不正です。";

  if (roleScope === "EMS" && !teamId) fieldErrors.teamId = "EMS 端末では救急隊所属が必須です。";
  if (roleScope === "EMS" && hospitalId) fieldErrors.hospitalId = "EMS 端末では病院所属を設定できません。";
  if (roleScope === "HOSPITAL" && !hospitalId) fieldErrors.hospitalId = "病院端末では病院所属が必須です。";
  if (roleScope === "HOSPITAL" && teamId) fieldErrors.teamId = "病院端末では救急隊所属を設定できません。";

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      deviceName,
      roleScope,
      teamId: roleScope === "EMS" ? teamId : null,
      hospitalId: roleScope === "HOSPITAL" ? hospitalId : null,
      isActive: normalizeBoolean(raw.isActive),
      isLost: normalizeBoolean(raw.isLost),
    },
  };
}
