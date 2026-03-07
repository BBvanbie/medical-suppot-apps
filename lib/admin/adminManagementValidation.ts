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
  if (division && !["1隊", "2隊", "3隊"].includes(division)) fieldErrors.division = "方面区分の値が不正です。";

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
  if (division && !["1隊", "2隊", "3隊"].includes(division)) fieldErrors.division = "方面区分の値が不正です。";

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
