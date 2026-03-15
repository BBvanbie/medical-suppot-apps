export type EmsNotificationSettings = {
  notifyNewResponse: boolean;
  notifyConsult: boolean;
  notifyAccepted: boolean;
  notifyDeclined: boolean;
  notifyRepeat: boolean;
};

export type EmsDisplaySettings = {
  textSize: "standard" | "large" | "xlarge";
  density: "standard" | "comfortable" | "compact";
};

export type EmsInputSettings = {
  autoTenkey: boolean;
  autoFocus: boolean;
  vitalsNext: boolean;
  requiredAlert: boolean;
};

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  fieldErrors: Record<string, string>;
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function parseEmsNotificationSettings(value: unknown): ValidationSuccess<EmsNotificationSettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const fields = ["notifyNewResponse", "notifyConsult", "notifyAccepted", "notifyDeclined", "notifyRepeat"] as const;
  for (const field of fields) {
    if (!isBoolean(raw[field])) fieldErrors[field] = "\u771f\u507d\u5024\u3067\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002";
  }

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      notifyNewResponse: raw.notifyNewResponse as boolean,
      notifyConsult: raw.notifyConsult as boolean,
      notifyAccepted: raw.notifyAccepted as boolean,
      notifyDeclined: raw.notifyDeclined as boolean,
      notifyRepeat: raw.notifyRepeat as boolean,
    },
  };
}

export function parseEmsDisplaySettings(value: unknown): ValidationSuccess<EmsDisplaySettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const textSize = String(raw.textSize ?? "");
  const density = String(raw.density ?? "");

  if (!["standard", "large", "xlarge"].includes(textSize)) {
    fieldErrors.textSize = "\u8a31\u53ef\u3055\u308c\u3066\u3044\u306a\u3044\u6587\u5b57\u30b5\u30a4\u30ba\u3067\u3059\u3002";
  }
  if (!["standard", "comfortable", "compact"].includes(density)) {
    fieldErrors.density = "\u8a31\u53ef\u3055\u308c\u3066\u3044\u306a\u3044\u8868\u793a\u5bc6\u5ea6\u3067\u3059\u3002";
  }

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      textSize: textSize as EmsDisplaySettings["textSize"],
      density: density as EmsDisplaySettings["density"],
    },
  };
}

export function parseEmsInputSettings(value: unknown): ValidationSuccess<EmsInputSettings> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const fields = ["autoTenkey", "autoFocus", "vitalsNext", "requiredAlert"] as const;
  for (const field of fields) {
    if (!isBoolean(raw[field])) fieldErrors[field] = "\u771f\u507d\u5024\u3067\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002";
  }

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      autoTenkey: raw.autoTenkey as boolean,
      autoFocus: raw.autoFocus as boolean,
      vitalsNext: raw.vitalsNext as boolean,
      requiredAlert: raw.requiredAlert as boolean,
    },
  };
}
