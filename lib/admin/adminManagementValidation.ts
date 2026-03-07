export type AdminHospitalCreateInput = {
  sourceNo: number;
  name: string;
  municipality: string;
  postalCode: string;
  address: string;
  phone: string;
};

export type AdminAmbulanceTeamCreateInput = {
  teamCode: string;
  teamName: string;
  division: string;
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
  if (!division) fieldErrors.division = "所属部は必須です。";
  if (division && !["1部", "2部", "3部"].includes(division)) fieldErrors.division = "所属部の値が不正です。";

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
