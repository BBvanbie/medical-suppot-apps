import { getAllOfflineRecords, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import { refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineQueueItem } from "@/lib/offline/offlineTypes";

function createQueueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueHospitalRequestSend(input: {
  localCaseId?: string;
  serverCaseId?: string;
  payload: unknown;
  baseServerUpdatedAt?: string | null;
}) {
  const item: OfflineQueueItem = {
    id: createQueueId("hospital-request"),
    type: "hospital_request_send",
    localCaseId: input.localCaseId,
    serverCaseId: input.serverCaseId,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "ready_to_send",
    errorMessage: null,
    failureKind: null,
    recoveryAction: null,
    lastAttemptAt: null,
    baseServerUpdatedAt: input.baseServerUpdatedAt ?? null,
  };
  await putOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item);
  await refreshOfflineQueueCount();
  return item;
}

export async function listHospitalRequestQueueItems() {
  const items = await getAllOfflineRecords<OfflineQueueItem>(OFFLINE_DB_STORES.offlineQueue);
  return items.filter((item) => item.type === "hospital_request_send");
}
