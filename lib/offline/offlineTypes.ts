export type OfflineMode = "online" | "offline" | "degraded" | "reconnected";

export type OfflineQueueItemType =
  | "case_update"
  | "hospital_request_send"
  | "consult_reply"
  | "settings_sync";

export type OfflineQueueItemStatus = "pending" | "ready_to_send" | "sending" | "conflict" | "failed";

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
  baseServerUpdatedAt?: string | null;
};

export type OfflineCaseDraft = {
  localCaseId: string;
  serverCaseId?: string;
  payload: unknown;
  syncStatus: OfflineSyncStatus;
  updatedAt: string;
  lastKnownServerUpdatedAt?: string | null;
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
  key: "notifications" | "display" | "input";
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

export type OfflineSnapshot = {
  mode: OfflineMode;
  pendingQueueCount: number;
  hasReconnectNotice: boolean;
  lastSyncAt: string | null;
  consecutiveFailures: number;
};
