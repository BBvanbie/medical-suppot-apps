export type DispatchCaseCreateInput = {
  teamId: number;
  dispatchDate: string;
  dispatchTime: string;
  dispatchAddress: string;
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

export function parseDispatchCaseCreateInput(value: unknown): ValidationSuccess<DispatchCaseCreateInput> | ValidationFailure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const teamIdText = normalizeText(raw.teamId);
  const teamId = Number(teamIdText);
  const dispatchDate = normalizeText(raw.dispatchDate);
  const dispatchTime = normalizeText(raw.dispatchTime);
  const dispatchAddress = normalizeText(raw.dispatchAddress);

  if (!teamIdText) {
    fieldErrors.teamId = "隊名を選択してください。";
  } else if (!Number.isInteger(teamId) || teamId <= 0) {
    fieldErrors.teamId = "隊名の値が不正です。";
  }

  if (!dispatchDate) {
    fieldErrors.dispatchDate = "覚知日付を入力してください。";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dispatchDate)) {
    fieldErrors.dispatchDate = "覚知日付の形式が不正です。";
  }

  if (!dispatchTime) {
    fieldErrors.dispatchTime = "覚知時間を入力してください。";
  } else if (!/^\d{2}:\d{2}$/.test(dispatchTime)) {
    fieldErrors.dispatchTime = "覚知時間の形式が不正です。";
  }

  if (!dispatchAddress) {
    fieldErrors.dispatchAddress = "指令先住所を入力してください。";
  }

  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      teamId,
      dispatchDate,
      dispatchTime,
      dispatchAddress,
    },
  };
}
