export type StartTriageTag = "" | "green" | "yellow" | "red" | "black";

export type TriageAssessment = {
  start: {
    walking: "" | "yes" | "no";
    respiration: "" | "normal" | "abnormal" | "absent" | "returns_after_airway";
    perfusion: "" | "normal" | "abnormal";
    mentalStatus: "" | "obeys" | "not_obeys";
    tag: StartTriageTag;
  };
  anatomical: {
    priority: "" | "black" | "red" | "yellow" | "green" | "not_applicable" | "pending";
    findings: string[];
    tag: StartTriageTag;
  };
  injuryDetails: string;
};

export const START_TRIAGE_TAG_LABELS: Record<Exclude<StartTriageTag, "">, string> = {
  green: "緑",
  yellow: "黄",
  red: "赤",
  black: "黒",
};

export const ANATOMICAL_TRIAGE_FINDINGS = [
  "開放性頭蓋骨骨折",
  "頸部・胸部皮下気腫",
  "フレイルチェスト",
  "開放性気胸",
  "腹部膨隆・腹壁緊張",
  "骨盤骨折疑い",
  "両側大腿骨骨折",
  "四肢切断",
  "四肢麻痺",
  "挟圧外傷",
  "穿通性外傷",
  "デグロービング損傷",
  "15%以上熱傷・気道熱傷",
] as const;

export function createEmptyTriageAssessment(): TriageAssessment {
  return {
    start: {
      walking: "",
      respiration: "",
      perfusion: "",
      mentalStatus: "",
      tag: "",
    },
    anatomical: {
      priority: "",
      findings: [],
      tag: "",
    },
    injuryDetails: "",
  };
}

export function calculateStartTriageTag(start: TriageAssessment["start"]): StartTriageTag {
  if (start.walking === "yes") return "green";
  if (start.walking !== "no") return "";
  if (start.respiration === "absent") return "black";
  if (start.respiration === "returns_after_airway" || start.respiration === "abnormal") return "red";
  if (start.perfusion === "abnormal") return "red";
  if (start.mentalStatus === "not_obeys") return "red";
  if (start.respiration === "normal" && start.perfusion === "normal" && start.mentalStatus === "obeys") return "yellow";
  return "";
}

export function calculatePatTriageTag(anatomical: TriageAssessment["anatomical"]): StartTriageTag {
  if (anatomical.priority === "black") return "black";
  if (anatomical.priority === "red" || anatomical.findings.length > 0) return "red";
  if (anatomical.priority === "yellow") return "yellow";
  if (anatomical.priority === "green" || anatomical.priority === "not_applicable") return "green";
  return "";
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringUnion<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeTriageAssessment(value: unknown): TriageAssessment {
  const input = asObject(value);
  const start = asObject(input.start);
  const anatomical = asObject(input.anatomical);
  const normalizedStart = {
    walking: asStringUnion(start.walking, ["", "yes", "no"] as const, ""),
    respiration: asStringUnion(start.respiration, ["", "normal", "abnormal", "absent", "returns_after_airway"] as const, ""),
    perfusion: asStringUnion(start.perfusion, ["", "normal", "abnormal"] as const, ""),
    mentalStatus: asStringUnion(start.mentalStatus, ["", "obeys", "not_obeys"] as const, ""),
    tag: asStringUnion(start.tag, ["", "green", "yellow", "red", "black"] as const, ""),
  };
  const normalizedAnatomical = {
    priority: asStringUnion(anatomical.priority, ["", "black", "red", "yellow", "green", "not_applicable", "pending"] as const, ""),
    findings: Array.isArray(anatomical.findings)
      ? anatomical.findings.map((item) => String(item).trim()).filter(Boolean)
      : [],
    tag: asStringUnion(anatomical.tag, ["", "green", "yellow", "red", "black"] as const, ""),
  };
  return {
    start: {
      ...normalizedStart,
      tag: calculateStartTriageTag(normalizedStart) || normalizedStart.tag,
    },
    anatomical: {
      ...normalizedAnatomical,
      tag: calculatePatTriageTag(normalizedAnatomical) || normalizedAnatomical.tag,
    },
    injuryDetails: typeof input.injuryDetails === "string" ? input.injuryDetails : "",
  };
}
