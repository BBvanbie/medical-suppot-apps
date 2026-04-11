import {
  clearAllOfflineStores,
  deleteOfflineRecord,
  getAllOfflineRecords,
  OFFLINE_DB_STORES,
} from "@/lib/offline/offlineDb";
import { refreshOfflineQueueCount, setOfflineSnapshot } from "@/lib/offline/offlineStore";
import type {
  OfflineCaseDraft,
  OfflineEmsSettings,
  OfflineHospitalCacheRow,
  OfflineQueueItem,
  OfflineSearchState,
  OfflineSyncMeta,
} from "@/lib/offline/offlineTypes";

const DAY_MS = 24 * 60 * 60 * 1000;

export const OFFLINE_RETENTION_DAYS = {
  hospitalCache: 1,
  searchState: 1,
  emsSettings: 14,
  syncMeta: 30,
  syncedCaseDraft: 1,
  unsyncedCaseDraft: 14,
  queueItem: 14,
} as const;

function isOlderThan(value: string | null | undefined, days: number, now = Date.now()) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp > days * DAY_MS;
}

export async function purgeExpiredOfflineData(now = Date.now()) {
  let deletedCount = 0;

  const drafts = await getAllOfflineRecords<OfflineCaseDraft>(OFFLINE_DB_STORES.caseDrafts);
  for (const draft of drafts) {
    const retentionDays = draft.syncStatus === "synced" ? OFFLINE_RETENTION_DAYS.syncedCaseDraft : OFFLINE_RETENTION_DAYS.unsyncedCaseDraft;
    if (isOlderThan(draft.updatedAt, retentionDays, now)) {
      await deleteOfflineRecord(OFFLINE_DB_STORES.caseDrafts, draft.localCaseId);
      deletedCount += 1;
    }
  }

  const queueItems = await getAllOfflineRecords<OfflineQueueItem>(OFFLINE_DB_STORES.offlineQueue);
  for (const item of queueItems) {
    if (isOlderThan(item.updatedAt, OFFLINE_RETENTION_DAYS.queueItem, now)) {
      await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item.id);
      deletedCount += 1;
    }
  }

  const hospitalRows = await getAllOfflineRecords<OfflineHospitalCacheRow>(OFFLINE_DB_STORES.hospitalCache);
  for (const row of hospitalRows) {
    if (isOlderThan(row.cachedAt, OFFLINE_RETENTION_DAYS.hospitalCache, now)) {
      await deleteOfflineRecord(OFFLINE_DB_STORES.hospitalCache, row.id);
      deletedCount += 1;
    }
  }

  const searchStates = await getAllOfflineRecords<OfflineSearchState>(OFFLINE_DB_STORES.searchState);
  for (const state of searchStates) {
    if (isOlderThan(state.updatedAt, OFFLINE_RETENTION_DAYS.searchState, now)) {
      await deleteOfflineRecord(OFFLINE_DB_STORES.searchState, state.key);
      deletedCount += 1;
    }
  }

  const settings = await getAllOfflineRecords<OfflineEmsSettings>(OFFLINE_DB_STORES.emsSettings);
  for (const setting of settings) {
    if (isOlderThan(setting.updatedAt, OFFLINE_RETENTION_DAYS.emsSettings, now)) {
      await deleteOfflineRecord(OFFLINE_DB_STORES.emsSettings, setting.key);
      deletedCount += 1;
    }
  }

  const metas = await getAllOfflineRecords<OfflineSyncMeta>(OFFLINE_DB_STORES.syncMeta);
  for (const meta of metas) {
    if (isOlderThan(meta.updatedAt, OFFLINE_RETENTION_DAYS.syncMeta, now)) {
      await deleteOfflineRecord(OFFLINE_DB_STORES.syncMeta, meta.key);
      deletedCount += 1;
    }
  }

  if (deletedCount > 0) {
    await refreshOfflineQueueCount();
  }

  return { deletedCount };
}

function clearSessionStorageDrafts() {
  if (typeof window === "undefined") return;
  const prefixes = [
    "active-case-context-key",
    "active-hospital-request-key",
    "hospital-request:",
    "hospital-request-sent:",
    "hospital-request-history",
  ];

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (!key) continue;
    if (prefixes.some((prefix) => key === prefix || key.startsWith(prefix))) {
      sessionStorage.removeItem(key);
    }
  }
}

export async function clearProtectedLocalData(reason: "logout" | "device_untrusted" | "session_invalidated" = "logout") {
  clearSessionStorageDrafts();
  await clearAllOfflineStores();
  setOfflineSnapshot({
    pendingQueueCount: 0,
    hasReconnectNotice: false,
    consecutiveFailures: 0,
    lastSyncAt: null,
  });
  return { reason };
}

export async function enforceOfflineLocalDataPolicy() {
  await purgeExpiredOfflineData();

  const response = await fetch("/api/security/device-status", {
    cache: "no-store",
  }).catch(() => null);

  if (!response) return;
  if (response.status === 401) {
    await clearProtectedLocalData("session_invalidated");
    return;
  }

  if (!response.ok) return;

  const status = (await response.json().catch(() => null)) as {
    role?: string;
    deviceEnforcementRequired?: boolean;
    deviceTrusted?: boolean;
  } | null;

  if (
    (status?.role === "EMS" || status?.role === "HOSPITAL") &&
    status.deviceEnforcementRequired === true &&
    status.deviceTrusted !== true
  ) {
    await clearProtectedLocalData("device_untrusted");
  }
}
