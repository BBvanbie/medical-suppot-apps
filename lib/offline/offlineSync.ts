import { createCaseRecord } from "@/lib/casesClient";
import { detectOfflineConflict } from "@/lib/offline/offlineConflict";
import { enqueueCaseUpdate, generateCanonicalCaseId, replaceOfflineCaseReferences, rewriteCasePayloadCaseId } from "@/lib/offline/offlineCaseQueue";
import { deleteOfflineRecord, getAllOfflineRecords, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import { deleteOfflineCaseDraft, listOfflineCaseDrafts, markOfflineCaseDraftSynced, saveOfflineCaseDraft } from "@/lib/offline/offlineCaseDrafts";
import { classifyOfflineException, classifyOfflineHttpFailure, canRetryOfflineQueueItem } from "@/lib/offline/offlineQueueRecovery";
import { markOfflineRequestFailure, markOfflineRequestSuccess, markOfflineSynced, refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineCaseDraft, OfflineQueueItem, OfflineQueueItemType } from "@/lib/offline/offlineTypes";

const AUTO_SYNC_TYPES: OfflineQueueItemType[] = ["case_update", "settings_sync"];
const MANUAL_ONLY_TYPES: OfflineQueueItemType[] = ["hospital_request_send", "consult_reply"];

const SETTINGS_ENDPOINTS = {
  notifications: "/api/settings/ambulance/notifications",
  display: "/api/settings/ambulance/display",
  input: "/api/settings/ambulance/input",
} as const;

type SendHistoryItemPayload = {
  requestId: string;
  caseId: string;
  createdAt?: string;
  sentAt?: string;
  searchMode?: "or" | "and";
  selectedDepartments?: string[];
  hospitals?: Array<{
    hospitalId: number;
    hospitalName: string;
    address: string;
    phone: string;
    departments: string[];
    distanceKm: number | null;
  }>;
};

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

function withAttemptState(item: OfflineQueueItem): OfflineQueueItem {
  return {
    ...item,
    status: "sending",
    updatedAt: new Date().toISOString(),
    errorMessage: null,
    failureKind: null,
    recoveryAction: null,
    lastAttemptAt: new Date().toISOString(),
  };
}

async function markQueueItemFailure(item: OfflineQueueItem, fallbackMessage: string, options?: { status?: OfflineQueueItem["status"]; error?: unknown; responseStatus?: number }) {
  const meta = typeof options?.responseStatus === "number"
    ? classifyOfflineHttpFailure(options.responseStatus, fallbackMessage)
    : classifyOfflineException(options?.error, fallbackMessage);

  await updateQueueItem({
    ...item,
    status: options?.status ?? "failed",
    updatedAt: new Date().toISOString(),
    errorMessage: meta.message,
    failureKind: meta.kind,
    recoveryAction: meta.recoveryAction,
    lastAttemptAt: new Date().toISOString(),
  });
}

async function syncSettingsQueueItem(item: OfflineQueueItem) {
  const payload = item.payload as { key?: keyof typeof SETTINGS_ENDPOINTS; payload?: unknown };
  const key = payload.key;
  if (!key || !(key in SETTINGS_ENDPOINTS)) {
    await markQueueItemFailure(item, "同期先の設定種別が不正です。", { responseStatus: 422 });
    return false;
  }

  await updateQueueItem(withAttemptState(item));

  try {
    const res = await fetch(SETTINGS_ENDPOINTS[key], {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload.payload ?? {}),
    });
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    if (!res.ok) {
      await markQueueItemFailure(item, data?.message ?? "設定同期に失敗しました。", { responseStatus: res.status });
      return false;
    }
  } catch (error) {
    await markQueueItemFailure(item, "設定同期に失敗しました。", { error });
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
  await updateQueueItem(withAttemptState(item));

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
    await markQueueItemFailure(item, "同期先の事案IDを解決できません。", { responseStatus: 422 });
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
      failureKind: "conflict",
      recoveryAction: "review",
      lastAttemptAt: new Date().toISOString(),
      conflictType: "requires_review",
      conflictFieldGroups: null,
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
    await markQueueItemFailure({ ...item, serverCaseId, payload }, "事案同期に失敗しました。", { error });
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

async function sendConsultReply(item: OfflineQueueItem) {
  const targetId = Number(item.targetId);
  const note = typeof (item.payload as { note?: unknown })?.note === "string" ? (item.payload as { note: string }).note : "";
  const res = await fetch(`/api/cases/consults/${targetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    throw { responseStatus: res.status, message: data?.message ?? "相談返信の再送に失敗しました。" };
  }
}

async function sendHospitalRequest(item: OfflineQueueItem) {
  const payload = item.payload as SendHistoryItemPayload;
  const caseId = item.serverCaseId ?? payload.caseId;
  const hospitals = Array.isArray(payload.hospitals) ? payload.hospitals : [];
  const sendHistoryItem = {
    requestId: payload.requestId,
    caseId,
    sentAt: new Date().toISOString(),
    status: "未読",
    hospitalCount: hospitals.length,
    hospitalNames: hospitals.map((hospital) => hospital.hospitalName),
    hospitals,
    searchMode: payload.searchMode,
    selectedDepartments: payload.selectedDepartments ?? [],
  };
  const res = await fetch("/api/cases/send-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, item: sendHistoryItem }),
  });
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    throw { responseStatus: res.status, message: data?.message ?? "受入要請送信の再送に失敗しました。" };
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

export async function resendOfflineQueueItem(item: OfflineQueueItem) {
  await updateQueueItem(withAttemptState(item));

  try {
    if (item.type === "consult_reply") {
      await sendConsultReply(item);
    } else if (item.type === "hospital_request_send") {
      await sendHospitalRequest(item);
    } else if (item.type === "settings_sync") {
      return syncSettingsQueueItem(item);
    } else if (item.type === "case_update") {
      return syncCaseQueueItem(item);
    } else {
      await markQueueItemFailure(item, "この種別の再送には未対応です。", { responseStatus: 422 });
      return false;
    }
  } catch (error) {
    const responseStatus = typeof error === "object" && error && "responseStatus" in error ? Number((error as { responseStatus?: unknown }).responseStatus) : undefined;
    const message = typeof error === "object" && error && "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : item.type === "consult_reply"
        ? "相談返信の再送に失敗しました。"
        : "受入要請送信の再送に失敗しました。";
    await markQueueItemFailure(item, message, { error, responseStatus });
    return false;
  }

  await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item.id);
  await refreshOfflineQueueCount();
  markOfflineSynced();
  return true;
}

export async function retryOfflineQueueItems(items: OfflineQueueItem[]) {
  let successCount = 0;
  let failedCount = 0;

  for (const item of items) {
    if (!canRetryOfflineQueueItem(item)) continue;
    const ok = await resendOfflineQueueItem(item);
    if (ok) {
      successCount += 1;
    } else {
      failedCount += 1;
    }
  }

  return { successCount, failedCount };
}

export async function autoSyncOfflineItems() {
  const draftSync = await syncOfflineCreateDrafts();
  const items = await listOfflineQueueItems();
  const autoSyncItems = items.filter((item) => (item.type === "settings_sync" || item.type === "case_update") && item.status === "pending");

  let synced = draftSync.synced;
  let failed = draftSync.failed;
  const attemptedCount = draftSync.synced + draftSync.failed + autoSyncItems.length;

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
      await markQueueItemFailure(item, "同期に失敗しました。", { error });
    }
  }

  if (attemptedCount === 0) {
    markOfflineRequestSuccess();
  } else if (failed > 0) {
    markOfflineRequestFailure();
  } else {
    markOfflineRequestSuccess();
  }

  return { synced, failed };
}

export async function refreshOfflineSyncSummary() {
  await refreshOfflineQueueCount();
}
