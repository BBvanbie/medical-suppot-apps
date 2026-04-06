const READ_REPLY_DELAY_MINUTES = 10;

type HospitalPriorityStatus = "UNREAD" | "READ" | "NEGOTIATING" | "ACCEPTABLE" | string;

export type HospitalPriorityInput = {
  status: HospitalPriorityStatus;
  sentAt?: string | null;
  openedAt?: string | null;
  consultAt?: string | null;
  respondedAt?: string | null;
  updatedAt?: string | null;
};

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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

export const HOSPITAL_REPLY_DELAY_MINUTES = READ_REPLY_DELAY_MINUTES;
