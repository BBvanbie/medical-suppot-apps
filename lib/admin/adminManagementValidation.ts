export type AdminHospitalCreateInput = {
  sourceNo: number;
  name: string;
  municipality: string;
  postalCode: string;
  address: string;
  phone: string;
};

export type AdminHospitalUpdateInput = {
  name: string;
  municipality: string;
  postalCode: string;
  address: string;
  phone: string;
  isActive: boolean;
};

export type AdminAmbulanceTeamCreateInput = {
  teamCode: string;
  teamName: string;
  division: string;
};

export type AdminAmbulanceTeamUpdateInput = {
  teamName: string;
  division: string;
  isActive: boolean;
};

export type AdminUserUpdateInput = {
  displayName: string;
  role: "EMS" | "HOSPITAL" | "ADMIN";
  teamId: number | null;
  hospitalId: number | null;
  isActive: boolean;
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

const VALID_AMBULANCE_TEAM_DIVISIONS = new Set([
  "本部機動",
  "1方面",
  "2方面",
  "3方面",
  "4方面",
  "5方面",
  "6方面",
  "7方面",
  "8方面",
  "9方面",
  "10方面",
]);

export function parseAdminHospitalCreateInput(value: unknown): ValidationSuccess<AdminHospitalCreateInput> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const sourceNoText = normalizeText(raw.sourceNo);
  const sourceNo = Number(sourceNoText);
  if (!sourceNoText) {
    fieldErrors.sourceNo = "施設コードは必須です。";
  } else if (!Number.isInteger(sourceNo) || sourceNo <= 0) {
    fieldErrors.sourceNo = "施設コードは正の整数で入力してください。";
  }

  const name = normalizeText(raw.name);
  if (!name) fieldErrors.name = "病院名は必須です。";

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      sourceNo,
      name,
      municipality: normalizeText(raw.municipality),
      postalCode: normalizeText(raw.postalCode),
      address: normalizeText(raw.address),
      phone: normalizeText(raw.phone),
    },
  };
}

export function parseAdminHospitalUpdateInput(value: unknown): ValidationSuccess<AdminHospitalUpdateInput> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const name = normalizeText(raw.name);
  if (!name) fieldErrors.name = "病院名は必須です。";

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      name,
      municipality: normalizeText(raw.municipality),
      postalCode: normalizeText(raw.postalCode),
      address: normalizeText(raw.address),
      phone: normalizeText(raw.phone),
      isActive: normalizeBoolean(raw.isActive),
    },
  };
}

export function parseAdminAmbulanceTeamCreateInput(
  value: unknown,
): ValidationSuccess<AdminAmbulanceTeamCreateInput> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const teamCode = normalizeText(raw.teamCode);
  const teamName = normalizeText(raw.teamName);
  const division = normalizeText(raw.division);

  if (!teamCode) fieldErrors.teamCode = "隊コードは必須です。";
  if (!teamName) fieldErrors.teamName = "隊名は必須です。";
  if (!division) fieldErrors.division = "方面区分は必須です。";
  if (division && !VALID_AMBULANCE_TEAM_DIVISIONS.has(division)) fieldErrors.division = "方面区分の値が不正です。";

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      teamCode,
      teamName,
      division,
    },
  };
}

export function parseAdminAmbulanceTeamUpdateInput(
  value: unknown,
): ValidationSuccess<AdminAmbulanceTeamUpdateInput> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const teamName = normalizeText(raw.teamName);
  const division = normalizeText(raw.division);

  if (!teamName) fieldErrors.teamName = "隊名は必須です。";
  if (!division) fieldErrors.division = "方面区分は必須です。";
  if (division && !VALID_AMBULANCE_TEAM_DIVISIONS.has(division)) fieldErrors.division = "方面区分の値が不正です。";

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      teamName,
      division,
      isActive: normalizeBoolean(raw.isActive),
    },
  };
}

export function parseAdminUserUpdateInput(value: unknown): ValidationSuccess<AdminUserUpdateInput> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const displayName = normalizeText(raw.displayName);
  const role = normalizeText(raw.role) as AdminUserUpdateInput["role"];
  const teamIdText = normalizeText(raw.teamId);
  const hospitalIdText = normalizeText(raw.hospitalId);
  const teamId = teamIdText ? Number(teamIdText) : null;
  const hospitalId = hospitalIdText ? Number(hospitalIdText) : null;

  if (!displayName) fieldErrors.displayName = "表示名は必須です。";
  if (!["EMS", "HOSPITAL", "ADMIN"].includes(role)) fieldErrors.role = "ロールの値が不正です。";
  if (teamIdText && (teamId == null || !Number.isInteger(teamId) || teamId <= 0)) fieldErrors.teamId = "救急隊の値が不正です。";
  if (hospitalIdText && (hospitalId == null || !Number.isInteger(hospitalId) || hospitalId <= 0)) fieldErrors.hospitalId = "病院の値が不正です。";

  if (role === "EMS" && !teamId) fieldErrors.teamId = "EMS ロールでは救急隊の所属が必須です。";
  if (role === "HOSPITAL" && !hospitalId) fieldErrors.hospitalId = "HOSPITAL ロールでは病院の所属が必須です。";
  if (role === "ADMIN" && (teamId || hospitalId)) {
    fieldErrors.role = "ADMIN ロールでは所属を設定できません。";
  }
  if (role === "EMS" && hospitalId) fieldErrors.hospitalId = "EMS ロールでは病院所属を設定できません。";
  if (role === "HOSPITAL" && teamId) fieldErrors.teamId = "HOSPITAL ロールでは救急隊所属を設定できません。";

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      displayName,
      role,
      teamId: role === "EMS" ? teamId : null,
      hospitalId: role === "HOSPITAL" ? hospitalId : null,
      isActive: normalizeBoolean(raw.isActive),
    },
  };
}
