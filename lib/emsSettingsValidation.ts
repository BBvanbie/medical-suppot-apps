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
    if (!isBoolean(raw[field])) fieldErrors[field] = "真偽値で指定してください。";
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
    fieldErrors.textSize = "許可されていない文字サイズです。";
  }
  if (!["standard", "comfortable", "compact"].includes(density)) {
    fieldErrors.density = "許可されていない表示密度です。";
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
    if (!isBoolean(raw[field])) fieldErrors[field] = "真偽値で指定してください。";
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
