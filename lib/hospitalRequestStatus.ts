export const HOSPITAL_REQUEST_STATUSES = [
  "UNREAD",
  "READ",
  "NEGOTIATING",
  "ACCEPTABLE",
  "NOT_ACCEPTABLE",
  "TRANSPORT_DECIDED",
  "TRANSPORT_DECLINED",
] as const;

export type HospitalRequestStatus = (typeof HOSPITAL_REQUEST_STATUSES)[number];

export type RequestActorRole = "HOSPITAL" | "EMS" | "ADMIN";

const hospitalTransitions: Record<HospitalRequestStatus, HospitalRequestStatus[]> = {
  UNREAD: ["READ", "NEGOTIATING", "ACCEPTABLE", "NOT_ACCEPTABLE"],
  READ: ["NEGOTIATING", "ACCEPTABLE", "NOT_ACCEPTABLE"],
  NEGOTIATING: ["ACCEPTABLE", "NOT_ACCEPTABLE"],
  ACCEPTABLE: [],
  NOT_ACCEPTABLE: [],
  TRANSPORT_DECIDED: [],
  TRANSPORT_DECLINED: [],
};

const emsTransitions: Record<HospitalRequestStatus, HospitalRequestStatus[]> = {
  UNREAD: [],
  READ: [],
  NEGOTIATING: ["TRANSPORT_DECLINED"],
  ACCEPTABLE: ["TRANSPORT_DECIDED", "TRANSPORT_DECLINED"],
  NOT_ACCEPTABLE: [],
  TRANSPORT_DECIDED: [],
  TRANSPORT_DECLINED: [],
};

export function isHospitalRequestStatus(value: unknown): value is HospitalRequestStatus {
  return typeof value === "string" && HOSPITAL_REQUEST_STATUSES.includes(value as HospitalRequestStatus);
}

export function canTransition(
  from: HospitalRequestStatus,
  to: HospitalRequestStatus,
  actorRole: RequestActorRole,
): boolean {
  if (from === to) return true;
  if (actorRole === "HOSPITAL") return hospitalTransitions[from].includes(to);
  if (actorRole === "EMS") return emsTransitions[from].includes(to);
  return actorRole === "ADMIN";
}

export function getStatusLabel(status: HospitalRequestStatus): string {
  const map: Record<HospitalRequestStatus, string> = {
    UNREAD: "未読",
    READ: "既読",
    NEGOTIATING: "要相談",
    ACCEPTABLE: "受入可能",
    NOT_ACCEPTABLE: "受入不可",
    TRANSPORT_DECIDED: "搬送決定",
    TRANSPORT_DECLINED: "辞退",
  };
  return map[status];
}
