export type HospitalFacilityEditableSettings = {
  displayContact: string;
  facilityNote: string;
};

export type HospitalOperationsSettings = {
  consultTemplate: string;
  declineTemplate: string;
};

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  fieldErrors: Record<string, string>;
};

export function parseHospitalFacilitySettings(value: unknown): ValidationSuccess<HospitalFacilityEditableSettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const displayContact = String(raw.displayContact ?? "").trim();
  const facilityNote = String(raw.facilityNote ?? "").trim();
  const fieldErrors: Record<string, string> = {};

  if (displayContact.length > 255) {
    fieldErrors.displayContact = "表示用連絡先は255文字以内で入力してください。";
  }

  if (facilityNote.length > 1000) {
    fieldErrors.facilityNote = "利用者向け補足文は1000文字以内で入力してください。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      displayContact,
      facilityNote,
    },
  };
}

export function parseHospitalOperationsSettings(value: unknown): ValidationSuccess<HospitalOperationsSettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const consultTemplate = String(raw.consultTemplate ?? "").trim();
  const declineTemplate = String(raw.declineTemplate ?? "").trim();
  const fieldErrors: Record<string, string> = {};

  if (consultTemplate.length > 1000) {
    fieldErrors.consultTemplate = "要相談テンプレートは1000文字以内で入力してください。";
  }
  if (declineTemplate.length > 1000) {
    fieldErrors.declineTemplate = "受入不可テンプレートは1000文字以内で入力してください。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      consultTemplate,
      declineTemplate,
    },
  };
}
