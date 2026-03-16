export type HospitalNotAcceptableReasonCode =
  | "DIFFICULT_TREATMENT"
  | "BUSY_WITH_OTHER_PATIENTS"
  | "OUT_OF_SPECIALTY"
  | "NO_BEDS"
  | "RECOMMEND_HIGHER_CARE"
  | "RECOMMEND_OTHER_DEPARTMENT"
  | "BLACKLISTED_PATIENT"
  | "OTHER";

export type TransportDeclinedReasonCode =
  | "TRANSFERRED_TO_OTHER_HOSPITAL"
  | "DECLINED_DUE_TO_DELAY"
  | "PATIENT_CIRCUMSTANCES";

export type DecisionReasonCode = HospitalNotAcceptableReasonCode | TransportDeclinedReasonCode;

export type DecisionReasonOption<TCode extends DecisionReasonCode = DecisionReasonCode> = {
  code: TCode;
  label: string;
  requiresText?: boolean;
  textLabel?: string;
  textPlaceholder?: string;
};

export const HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS: DecisionReasonOption<HospitalNotAcceptableReasonCode>[] = [
  { code: "DIFFICULT_TREATMENT", label: "処置対応困難" },
  { code: "BUSY_WITH_OTHER_PATIENTS", label: "他患者対応中" },
  { code: "OUT_OF_SPECIALTY", label: "専門外" },
  { code: "NO_BEDS", label: "空床なし" },
  { code: "RECOMMEND_HIGHER_CARE", label: "高次医療機関を推奨" },
  {
    code: "RECOMMEND_OTHER_DEPARTMENT",
    label: "他科受診を推奨",
    requiresText: true,
    textLabel: "推奨先と補足理由",
    textPlaceholder: "推奨する診療科や医療機関、補足理由を入力してください",
  },
  { code: "BLACKLISTED_PATIENT", label: "受入不可患者" },
  {
    code: "OTHER",
    label: "その他",
    requiresText: true,
    textLabel: "補足理由",
    textPlaceholder: "補足理由を入力してください",
  },
];

export const TRANSPORT_DECLINED_REASON_OPTIONS: DecisionReasonOption<TransportDeclinedReasonCode>[] = [
  { code: "TRANSFERRED_TO_OTHER_HOSPITAL", label: "他院へ搬送決定" },
  { code: "DECLINED_DUE_TO_DELAY", label: "搬送遅延のため辞退" },
  { code: "PATIENT_CIRCUMSTANCES", label: "患者事情" },
];

const HOSPITAL_REASON_CODE_SET = new Set(HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS.map((option) => option.code));
const TRANSPORT_REASON_CODE_SET = new Set(TRANSPORT_DECLINED_REASON_OPTIONS.map((option) => option.code));
const LABEL_BY_CODE = new Map<DecisionReasonCode, string>([
  ...HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS.map((option) => [option.code, option.label] as const),
  ...TRANSPORT_DECLINED_REASON_OPTIONS.map((option) => [option.code, option.label] as const),
]);

export function isHospitalNotAcceptableReasonCode(value: unknown): value is HospitalNotAcceptableReasonCode {
  return typeof value === "string" && HOSPITAL_REASON_CODE_SET.has(value as HospitalNotAcceptableReasonCode);
}

export function isTransportDeclinedReasonCode(value: unknown): value is TransportDeclinedReasonCode {
  return typeof value === "string" && TRANSPORT_REASON_CODE_SET.has(value as TransportDeclinedReasonCode);
}

export function getDecisionReasonLabel(code: DecisionReasonCode): string {
  return LABEL_BY_CODE.get(code) ?? code;
}

export function requiresDecisionReasonText(code: DecisionReasonCode): boolean {
  return code === "RECOMMEND_OTHER_DEPARTMENT" || code === "OTHER";
}

export function normalizeDecisionReasonText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function formatDecisionReasonNote(input: { reasonCode: DecisionReasonCode; reasonText?: string | null }): string {
  const label = getDecisionReasonLabel(input.reasonCode);
  const detail = normalizeDecisionReasonText(input.reasonText);
  return detail ? `${label}: ${detail}` : label;
}
