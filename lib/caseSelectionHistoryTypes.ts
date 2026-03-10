export type CaseSelectionRequestStatus =
  | "UNREAD"
  | "READ"
  | "NEGOTIATING"
  | "ACCEPTABLE"
  | "NOT_ACCEPTABLE"
  | "TRANSPORT_DECIDED"
  | "TRANSPORT_DECLINED";

export type CaseSelectionHistoryItem = {
  targetId: number;
  requestId: string;
  sentAt: string;
  hospitalName: string;
  status: CaseSelectionRequestStatus;
  updatedAt: string;
  lastActor: "A" | "HP" | null;
  selectedDepartments: string[];
  latestHpComment: string | null;
  latestAReply: string | null;
};
