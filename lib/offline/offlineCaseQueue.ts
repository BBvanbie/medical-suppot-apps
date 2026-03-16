import { getAllOfflineRecords, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import { refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineQueueItem } from "@/lib/offline/offlineTypes";

function createQueueId(caseId: string) {
  return `case-update-${caseId}`;
}

function updatePayloadCaseReferences(payload: unknown, localCaseId: string, serverCaseId: string): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const nextPayload: Record<string, unknown> = { ...record };

  if (nextPayload.caseId === localCaseId) {
    nextPayload.caseId = serverCaseId;
  }

  const casePayload = nextPayload.casePayload;
  if (casePayload && typeof casePayload === "object") {
    const casePayloadRecord = { ...(casePayload as Record<string, unknown>) };
    const basic = casePayloadRecord.basic;
    if (basic && typeof basic === "object") {
      const basicRecord = { ...(basic as Record<string, unknown>) };
      if (basicRecord.caseId === localCaseId) {
        basicRecord.caseId = serverCaseId;
      }
      casePayloadRecord.basic = basicRecord;
    }
    nextPayload.casePayload = casePayloadRecord;
  }

  return nextPayload;
}

export function generateCanonicalCaseId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `C-${y}${m}${d}-${hh}${mm}${ss}${suffix}`;
}

export async function enqueueCaseUpdate(input: {
  localCaseId: string;
  serverCaseId?: string;
  payload: unknown;
  baseServerUpdatedAt?: string | null;
}) {
  const timestamp = new Date().toISOString();
  const item: OfflineQueueItem = {
    id: createQueueId(input.serverCaseId ?? input.localCaseId),
    type: "case_update",
    localCaseId: input.localCaseId,
    serverCaseId: input.serverCaseId,
    payload: input.payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "pending",
    errorMessage: null,
    baseServerUpdatedAt: input.baseServerUpdatedAt ?? null,
  };
  await putOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item);
  await refreshOfflineQueueCount();
  return item;
}

export async function listCaseUpdateQueueItems() {
  const items = await getAllOfflineRecords<OfflineQueueItem>(OFFLINE_DB_STORES.offlineQueue);
  return items.filter((item) => item.type === "case_update");
}

export async function replaceOfflineCaseReferences(localCaseId: string, serverCaseId: string) {
  const items = await getAllOfflineRecords<OfflineQueueItem>(OFFLINE_DB_STORES.offlineQueue);
  const matchedItems = items.filter((item) => item.localCaseId === localCaseId || item.serverCaseId === localCaseId);

  for (const item of matchedItems) {
    const nextItem: OfflineQueueItem = {
      ...item,
      id: item.type === "case_update" ? createQueueId(serverCaseId) : item.id,
      localCaseId,
      serverCaseId,
      payload: updatePayloadCaseReferences(item.payload, localCaseId, serverCaseId),
      updatedAt: new Date().toISOString(),
    };
    await putOfflineRecord(OFFLINE_DB_STORES.offlineQueue, nextItem);
    if (nextItem.id !== item.id) {
      const { deleteOfflineRecord } = await import("@/lib/offline/offlineDb");
      await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item.id);
    }
  }

  await refreshOfflineQueueCount();
}

export function rewriteCasePayloadCaseId(payload: unknown, serverCaseId: string) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const localCaseId = typeof record.caseId === "string" ? record.caseId : serverCaseId;
  return updatePayloadCaseReferences(payload, localCaseId, serverCaseId);
}
