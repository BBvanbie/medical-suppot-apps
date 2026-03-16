import { getAllOfflineRecords, getOfflineRecord, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import { refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineEmsSettings, OfflineQueueItem } from "@/lib/offline/offlineTypes";

function createSettingsQueueId(key: OfflineEmsSettings["key"]) {
  return `settings-${key}`;
}

export async function saveOfflineEmsSetting(key: OfflineEmsSettings["key"], payload: unknown, lastKnownServerUpdatedAt?: string | null) {
  const setting: OfflineEmsSettings = {
    key,
    payload,
    updatedAt: new Date().toISOString(),
    lastKnownServerUpdatedAt: lastKnownServerUpdatedAt ?? null,
  };
  await putOfflineRecord(OFFLINE_DB_STORES.emsSettings, setting);

  const queueItem: OfflineQueueItem = {
    id: createSettingsQueueId(key),
    type: "settings_sync",
    payload: { key, payload },
    createdAt: setting.updatedAt,
    updatedAt: setting.updatedAt,
    status: "pending",
    baseServerUpdatedAt: lastKnownServerUpdatedAt ?? null,
  };
  await putOfflineRecord(OFFLINE_DB_STORES.offlineQueue, queueItem);
  await refreshOfflineQueueCount();
  return setting;
}

export function getOfflineEmsSetting(key: OfflineEmsSettings["key"]) {
  return getOfflineRecord<OfflineEmsSettings>(OFFLINE_DB_STORES.emsSettings, key);
}

export function listOfflineEmsSettings() {
  return getAllOfflineRecords<OfflineEmsSettings>(OFFLINE_DB_STORES.emsSettings);
}
