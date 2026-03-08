export type CaseSelectionHistoryItem = {
  targetId: number;
  requestId: string;
  sentAt: string;
  hospitalName: string;
  status: string;
  updatedAt: string;
  lastActor: "A" | "HP" | null;
  selectedDepartments: string[];
  latestHpComment: string | null;
  latestAReply: string | null;
};
