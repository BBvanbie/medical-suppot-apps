export type HospitalFacilityEditableSettings = {
  displayContact: string;
  facilityNote: string;
};

export type HospitalOperationsSettings = {
  consultTemplate: string;
  declineTemplate: string;
};

export type HospitalNotificationSettings = {
  notifyNewRequest: boolean;
  notifyReplyArrival: boolean;
  notifyTransportDecided: boolean;
  notifyTransportDeclined: boolean;
  notifyRepeat: boolean;
  notifyReplyDelay: boolean;
  replyDelayMinutes: 10 | 15 | 20;
};

export type HospitalDisplaySettings = {
  displayDensity: "standard" | "comfortable" | "compact";
  defaultSort: "updated" | "received" | "priority";
};

export type HospitalDashboardSettings = {
  responseTargetMinutes: number;
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
    fieldErrors.displayContact = "??????? 255 ??????????????";
  }

  if (facilityNote.length > 1000) {
    fieldErrors.facilityNote = "????? 1000 ??????????????";
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
    fieldErrors.consultTemplate = "?????????? 1000 ??????????????";
  }
  if (declineTemplate.length > 1000) {
    fieldErrors.declineTemplate = "??????????? 1000 ??????????????";
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

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function parseHospitalNotificationSettings(value: unknown): ValidationSuccess<HospitalNotificationSettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const booleanFields = [
    "notifyNewRequest",
    "notifyReplyArrival",
    "notifyTransportDecided",
    "notifyTransportDeclined",
    "notifyRepeat",
    "notifyReplyDelay",
  ] as const;

  for (const field of booleanFields) {
    if (!isBoolean(raw[field])) fieldErrors[field] = "?????????????";
  }

  const replyDelayMinutes = Number(raw.replyDelayMinutes);
  if (![10, 15, 20].includes(replyDelayMinutes)) {
    fieldErrors.replyDelayMinutes = "????????? 10 / 15 / 20 ???????????";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      notifyNewRequest: raw.notifyNewRequest as boolean,
      notifyReplyArrival: raw.notifyReplyArrival as boolean,
      notifyTransportDecided: raw.notifyTransportDecided as boolean,
      notifyTransportDeclined: raw.notifyTransportDeclined as boolean,
      notifyRepeat: raw.notifyRepeat as boolean,
      notifyReplyDelay: raw.notifyReplyDelay as boolean,
      replyDelayMinutes: replyDelayMinutes as 10 | 15 | 20,
    },
  };
}

export function parseHospitalDisplaySettings(value: unknown): ValidationSuccess<HospitalDisplaySettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const displayDensity = String(raw.displayDensity ?? "");
  const defaultSort = String(raw.defaultSort ?? "");

  if (!["standard", "comfortable", "compact"].includes(displayDensity)) {
    fieldErrors.displayDensity = "????????????";
  }
  if (!["updated", "received", "priority"].includes(defaultSort)) {
    fieldErrors.defaultSort = "?????????????";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      displayDensity: displayDensity as HospitalDisplaySettings["displayDensity"],
      defaultSort: defaultSort as HospitalDisplaySettings["defaultSort"],
    },
  };
}

export function parseHospitalDashboardSettings(value: unknown): ValidationSuccess<HospitalDashboardSettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};
  const responseTargetMinutes = Number(raw.responseTargetMinutes);

  if (!Number.isInteger(responseTargetMinutes) || responseTargetMinutes < 1 || responseTargetMinutes > 180) {
    fieldErrors.responseTargetMinutes = "????? 1?180 ??????????????";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      responseTargetMinutes,
    },
  };
}
