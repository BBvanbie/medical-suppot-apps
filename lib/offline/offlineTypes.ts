export type OfflineMode = "online" | "offline" | "reconnected";

export type OfflineQueueItemType =
  | "case_update"
  | "hospital_request_send"
  | "consult_reply"
  | "settings_sync";

export type OfflineQueueItemStatus = "pending" | "ready_to_send" | "sending" | "conflict" | "failed";

export type OfflineFailureKind = "network" | "server" | "validation" | "conflict" | "unknown";

export type OfflineRecoveryAction = "retry" | "review" | "discard";

export type OfflineSyncStatus = "idle" | "local_only" | "queued" | "synced" | "conflict" | "failed";

export type OfflineQueueItem = {
  id: string;
  type: OfflineQueueItemType;
  localCaseId?: string;
  serverCaseId?: string;
  targetId?: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  status: OfflineQueueItemStatus;
  errorMessage?: string | null;
  failureKind?: OfflineFailureKind | null;
  recoveryAction?: OfflineRecoveryAction | null;
  lastAttemptAt?: string | null;
  baseServerUpdatedAt?: string | null;
  conflictType?: OfflineConflictType | null;
  conflictFieldGroups?: OfflineFieldGroup[] | null;
};

export type OfflineCaseDraft = {
  localCaseId: string;
  serverCaseId?: string;
  payload: unknown;
  syncStatus: OfflineSyncStatus;
  updatedAt: string;
  lastKnownServerUpdatedAt?: string | null;
  serverSnapshot?: unknown;
};

export type OfflineHospitalCacheRow = {
  id: string;
  hospitalId: number;
  hospitalName: string;
  municipality?: string;
  address: string;
  phone: string;
  departments: string[];
  distanceKm?: number | null;
  cachedAt: string;
};

export type OfflineSearchState = {
  key: string;
  payload: unknown;
  updatedAt: string;
};

export type OfflineEmsSettings = {
  key: "notifications" | "display" | "input" | "operationalMode";
  payload: unknown;
  updatedAt: string;
  lastKnownServerUpdatedAt?: string | null;
};

export type OfflineSyncMeta = {
  key: string;
  value: unknown;
  updatedAt: string;
};

export type OfflineConflictResult = {
  conflict: boolean;
  reason?: string;
};

export type OfflineFieldGroup = "basic" | "summary" | "findingsV2" | "sendHistory";

export type OfflineConflictType =
  | "requires_review"
  | "local_only_changed"
  | "server_only_changed"
  | "both_changed_same_field"
  | "both_changed_different_fields";

export type OfflineConflictSummary = {
  type: OfflineConflictType;
  localGroups: OfflineFieldGroup[];
  serverGroups: OfflineFieldGroup[];
  reason: string;
};

export type OfflineConflictFieldDiff = {
  path: string;
  baseValue: string;
  localValue: string;
  serverValue: string;
  changedInLocal: boolean;
  changedInServer: boolean;
};

export type OfflineConflictGroupDiff = {
  group: OfflineFieldGroup;
  fields: OfflineConflictFieldDiff[];
};

export type OfflineSnapshot = {
  mode: OfflineMode;
  pendingQueueCount: number;
  hasReconnectNotice: boolean;
  lastSyncAt: string | null;
  consecutiveFailures: number;
};
