const READ_REPLY_DELAY_MINUTES = 10;

type HospitalPriorityStatus = "UNREAD" | "READ" | "NEGOTIATING" | "ACCEPTABLE" | string;

export type HospitalPriorityInput = {
  status: HospitalPriorityStatus;
  selectedDepartments?: string[] | null;
  sentAt?: string | null;
  openedAt?: string | null;
  consultAt?: string | null;
  respondedAt?: string | null;
  updatedAt?: string | null;
};

const DEPARTMENT_PRIORITY_LABELS = [
  ["救命"],
  ["CCU", "CCUネットワーク", "CCUネ"],
  ["脳卒中S", "脳S", "脳卒中A", "脳A"],
] as const;

const DEPARTMENT_PRIORITY_SUMMARIES = ["救命優先", "CCU優先", "脳卒中優先"] as const;

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeDepartmentPriorityLabel(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function getDepartmentPriorityRank(departments?: string[] | null) {
  const normalized = new Set((departments ?? []).map((value) => normalizeDepartmentPriorityLabel(value)));
  if (normalized.size === 0) return DEPARTMENT_PRIORITY_LABELS.length;

  const rank = DEPARTMENT_PRIORITY_LABELS.findIndex((labels) =>
    labels.some((label) => normalized.has(normalizeDepartmentPriorityLabel(label))),
  );
  return rank >= 0 ? rank : DEPARTMENT_PRIORITY_LABELS.length;
}

export function getHospitalDepartmentPrioritySummary(departments?: string[] | null) {
  const rank = getDepartmentPriorityRank(departments);
  return rank >= 0 && rank < DEPARTMENT_PRIORITY_SUMMARIES.length ? DEPARTMENT_PRIORITY_SUMMARIES[rank] : null;
}

function getStatusRank(status: HospitalPriorityStatus) {
  if (status === "NEGOTIATING") return 0;
  if (status === "READ") return 1;
  if (status === "UNREAD") return 2;
  if (status === "ACCEPTABLE") return 3;
  return 4;
}

export function getHospitalPriorityReference(input: HospitalPriorityInput) {
  if (input.status === "NEGOTIATING") {
    return toTimestamp(input.consultAt) || toTimestamp(input.updatedAt) || toTimestamp(input.openedAt) || toTimestamp(input.sentAt);
  }
  if (input.status === "READ") {
    return toTimestamp(input.openedAt) || toTimestamp(input.updatedAt) || toTimestamp(input.sentAt);
  }
  if (input.status === "UNREAD") {
    return toTimestamp(input.sentAt);
  }
  if (input.status === "ACCEPTABLE") {
    return toTimestamp(input.respondedAt) || toTimestamp(input.updatedAt) || toTimestamp(input.sentAt);
  }
  return toTimestamp(input.updatedAt) || toTimestamp(input.sentAt);
}

export function compareHospitalPriority(a: HospitalPriorityInput, b: HospitalPriorityInput) {
  const departmentRankDiff = getDepartmentPriorityRank(a.selectedDepartments) - getDepartmentPriorityRank(b.selectedDepartments);
  if (departmentRankDiff !== 0) return departmentRankDiff;

  const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
  if (rankDiff !== 0) return rankDiff;

  const timeDiff = getHospitalPriorityReference(a) - getHospitalPriorityReference(b);
  if (timeDiff !== 0) return timeDiff;

  return 0;
}

export function isHospitalReplyDelay(status: HospitalPriorityStatus, openedAt?: string | null, now = Date.now()) {
  if (status !== "READ" || !openedAt) return false;
  const openedAtMs = toTimestamp(openedAt);
  if (!openedAtMs) return false;
  return (now - openedAtMs) / 60000 >= READ_REPLY_DELAY_MINUTES;
}

export function getHospitalNextActionLabel(status: HospitalPriorityStatus) {
  if (status === "NEGOTIATING") return "相談継続";
  if (status === "READ") return "返信判断";
  if (status === "UNREAD") return "内容確認";
  if (status === "ACCEPTABLE") return "搬送決定待ち";
  return "状況確認";
}

export const HOSPITAL_REPLY_DELAY_MINUTES = READ_REPLY_DELAY_MINUTES;
