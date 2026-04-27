export type DispatchCaseCreateInput = {
  teamIds: number[];
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

  const rawTeamIds = Array.isArray(raw.teamIds) ? raw.teamIds : [raw.teamId];
  const providedTeamIdTexts = rawTeamIds.map((item) => normalizeText(item)).filter(Boolean);
  const hasInvalidTeamId = providedTeamIdTexts.some((item) => {
    const teamId = Number(item);
    return !Number.isInteger(teamId) || teamId <= 0;
  });
  const teamIds = Array.from(
    new Set(
      providedTeamIdTexts
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
  const dispatchDate = normalizeText(raw.dispatchDate);
  const dispatchTime = normalizeText(raw.dispatchTime);
  const dispatchAddress = normalizeText(raw.dispatchAddress);

  if (providedTeamIdTexts.length === 0) {
    fieldErrors.teamIds = "出場隊を1隊以上選択してください。";
    fieldErrors.teamId = fieldErrors.teamIds;
  } else if (hasInvalidTeamId) {
    fieldErrors.teamIds = "出場隊の値が不正です。";
    fieldErrors.teamId = fieldErrors.teamIds;
  } else if (teamIds.length > 20) {
    fieldErrors.teamIds = "一度に起票できる出場隊は20隊までです。";
    fieldErrors.teamId = fieldErrors.teamIds;
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
      teamIds,
      dispatchDate,
      dispatchTime,
      dispatchAddress,
    },
  };
}
