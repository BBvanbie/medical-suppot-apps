import { createCaseRecord } from "@/lib/casesClient";
import { detectOfflineConflict } from "@/lib/offline/offlineConflict";
import { enqueueCaseUpdate, generateCanonicalCaseId, replaceOfflineCaseReferences, rewriteCasePayloadCaseId } from "@/lib/offline/offlineCaseQueue";
import { deleteOfflineRecord, getAllOfflineRecords, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import { deleteOfflineCaseDraft, listOfflineCaseDrafts, markOfflineCaseDraftSynced, saveOfflineCaseDraft } from "@/lib/offline/offlineCaseDrafts";
import { markOfflineRequestFailure, markOfflineRequestSuccess, markOfflineSynced, refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineCaseDraft, OfflineQueueItem, OfflineQueueItemType } from "@/lib/offline/offlineTypes";

const AUTO_SYNC_TYPES: OfflineQueueItemType[] = ["case_update", "settings_sync"];
const MANUAL_ONLY_TYPES: OfflineQueueItemType[] = ["hospital_request_send", "consult_reply"];

const SETTINGS_ENDPOINTS = {
  notifications: "/api/settings/ambulance/notifications",
  display: "/api/settings/ambulance/display",
  input: "/api/settings/ambulance/input",
} as const;

function isOfflineLocalCaseId(caseId?: string) {
  return typeof caseId === "string" && caseId.startsWith("offline-");
}

function getPayloadCaseId(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return typeof record.caseId === "string" ? record.caseId : null;
}

function getPayloadUpdatedAt(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const casePayload = record.casePayload;
  if (!casePayload || typeof casePayload !== "object") return null;
  const basic = (casePayload as Record<string, unknown>).basic;
  if (!basic || typeof basic !== "object") return null;
  const updatedAt = (basic as Record<string, unknown>).updatedAt;
  return typeof updatedAt === "string" ? updatedAt : null;
}

async function updateQueueItem(item: OfflineQueueItem) {
  await putOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item);
  await refreshOfflineQueueCount();
}

async function syncSettingsQueueItem(item: OfflineQueueItem) {
  const payload = item.payload as { key?: keyof typeof SETTINGS_ENDPOINTS; payload?: unknown };
  const key = payload.key;
  if (!key || !(key in SETTINGS_ENDPOINTS)) {
    await updateQueueItem({
      ...item,
      status: "failed",
      updatedAt: new Date().toISOString(),
      errorMessage: "同期先の設定種別が不正です。",
    });
    return false;
  }

  await updateQueueItem({
    ...item,
    status: "sending",
    updatedAt: new Date().toISOString(),
    errorMessage: null,
  });

  const res = await fetch(SETTINGS_ENDPOINTS[key], {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload.payload ?? {}),
  });
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    await updateQueueItem({
      ...item,
      status: "failed",
      updatedAt: new Date().toISOString(),
      errorMessage: data?.message ?? "設定同期に失敗しました。",
    });
    return false;
  }

  await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item.id);
  await refreshOfflineQueueCount();
  markOfflineSynced();
  return true;
}

async function resolveLocalDraftToServerCaseId(draft: OfflineCaseDraft) {
  if (!isOfflineLocalCaseId(draft.localCaseId)) {
    return draft.serverCaseId ?? draft.localCaseId;
  }

  const serverCaseId = draft.serverCaseId ?? generateCanonicalCaseId();
  const payload = rewriteCasePayloadCaseId(draft.payload, serverCaseId);

  await createCaseRecord<typeof payload, { caseId?: string }>(payload);
  await markOfflineCaseDraftSynced(draft.localCaseId, serverCaseId);
  await replaceOfflineCaseReferences(draft.localCaseId, serverCaseId);
  await saveOfflineCaseDraft({
    localCaseId: draft.localCaseId,
    serverCaseId,
    payload,
    syncStatus: "synced",
    lastKnownServerUpdatedAt: new Date().toISOString(),
  });
  return serverCaseId;
}

async function syncOfflineCreateDrafts() {
  const drafts = await listOfflineCaseDrafts();
  const localOnlyDrafts = drafts.filter((draft) => isOfflineLocalCaseId(draft.localCaseId) && !draft.serverCaseId);

  let synced = 0;
  let failed = 0;

  for (const draft of localOnlyDrafts) {
    try {
      await resolveLocalDraftToServerCaseId(draft);
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}

async function syncCaseQueueItem(item: OfflineQueueItem) {
  await updateQueueItem({
    ...item,
    status: "sending",
    updatedAt: new Date().toISOString(),
    errorMessage: null,
  });

  let serverCaseId = item.serverCaseId ?? item.localCaseId ?? getPayloadCaseId(item.payload) ?? undefined;
  if (isOfflineLocalCaseId(serverCaseId) || (item.localCaseId && isOfflineLocalCaseId(item.localCaseId) && !item.serverCaseId)) {
    const draft = item.localCaseId
      ? (await listOfflineCaseDrafts()).find((row) => row.localCaseId === item.localCaseId) ?? null
      : null;

    if (draft) {
      serverCaseId = await resolveLocalDraftToServerCaseId(draft);
    } else if (serverCaseId && isOfflineLocalCaseId(serverCaseId)) {
      serverCaseId = generateCanonicalCaseId();
    }
  }

  if (!serverCaseId) {
    await updateQueueItem({
      ...item,
      status: "failed",
      updatedAt: new Date().toISOString(),
      errorMessage: "同期先の事案IDを解決できません。",
    });
    return false;
  }

  const payload = rewriteCasePayloadCaseId(item.payload, serverCaseId);
  const conflict = detectOfflineConflict(item.baseServerUpdatedAt, getPayloadUpdatedAt(payload));
  if (conflict.conflict) {
    await updateQueueItem({
      ...item,
      serverCaseId,
      payload,
      status: "conflict",
      updatedAt: new Date().toISOString(),
      errorMessage: conflict.reason ?? "競合を検知しました。",
    });
    if (item.localCaseId) {
      await saveOfflineCaseDraft({
        localCaseId: item.localCaseId,
        serverCaseId,
        payload,
        syncStatus: "conflict",
        lastKnownServerUpdatedAt: item.baseServerUpdatedAt ?? null,
      });
    }
    return false;
  }

  try {
    await createCaseRecord<typeof payload, { caseId?: string }>(payload);
    if (item.localCaseId) {
      await saveOfflineCaseDraft({
        localCaseId: item.localCaseId,
        serverCaseId,
        payload,
        syncStatus: "synced",
        lastKnownServerUpdatedAt: new Date().toISOString(),
      });
      if (item.localCaseId === serverCaseId) {
        await deleteOfflineCaseDraft(item.localCaseId);
      }
    }
    await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item.id);
    await refreshOfflineQueueCount();
    markOfflineSynced();
    return true;
  } catch (error) {
    await updateQueueItem({
      ...item,
      serverCaseId,
      payload,
      status: "failed",
      updatedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : "事案同期に失敗しました。",
    });
    if (item.localCaseId) {
      await enqueueCaseUpdate({
        localCaseId: item.localCaseId,
        serverCaseId,
        payload,
        baseServerUpdatedAt: item.baseServerUpdatedAt ?? null,
      });
    }
    return false;
  }
}

export function canAutoSyncOfflineItem(type: OfflineQueueItemType) {
  return AUTO_SYNC_TYPES.includes(type);
}

export function isManualOnlyOfflineItem(type: OfflineQueueItemType) {
  return MANUAL_ONLY_TYPES.includes(type);
}

export async function listOfflineQueueItems() {
  return getAllOfflineRecords<OfflineQueueItem>(OFFLINE_DB_STORES.offlineQueue);
}

export async function listManualOfflineQueueItems() {
  const items = await listOfflineQueueItems();
  return items.filter((item) => isManualOnlyOfflineItem(item.type));
}

export async function autoSyncOfflineItems() {
  const draftSync = await syncOfflineCreateDrafts();
  const items = await listOfflineQueueItems();
  const autoSyncItems = items.filter((item) => item.type === "settings_sync" || item.type === "case_update");

  let synced = draftSync.synced;
  let failed = draftSync.failed;

  for (const item of autoSyncItems) {
    try {
      const ok = item.type === "settings_sync" ? await syncSettingsQueueItem(item) : await syncCaseQueueItem(item);
      if (ok) {
        synced += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      await updateQueueItem({
        ...item,
        status: "failed",
        updatedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "同期に失敗しました。",
      });
    }
  }

  if (failed > 0) {
    markOfflineRequestFailure();
  } else {
    markOfflineRequestSuccess();
  }

  return { synced, failed };
}

export async function refreshOfflineSyncSummary() {
  await refreshOfflineQueueCount();
}
