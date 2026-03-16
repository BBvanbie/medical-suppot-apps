import {
  deleteOfflineRecord,
  getAllOfflineRecords,
  getOfflineRecord,
  OFFLINE_DB_STORES,
  putOfflineRecord,
} from "@/lib/offline/offlineDb";
import { markOfflineSynced } from "@/lib/offline/offlineStore";
import type { OfflineCaseDraft, OfflineSyncStatus } from "@/lib/offline/offlineTypes";

function createSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export function generateOfflineCaseId() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `offline-${yyyy}${mm}${dd}-${createSuffix()}`;
}

export async function saveOfflineCaseDraft(input: {
  localCaseId: string;
  serverCaseId?: string;
  payload: unknown;
  syncStatus?: OfflineSyncStatus;
  lastKnownServerUpdatedAt?: string | null;
}) {
  const draft: OfflineCaseDraft = {
    localCaseId: input.localCaseId,
    serverCaseId: input.serverCaseId,
    payload: input.payload,
    syncStatus: input.syncStatus ?? "local_only",
    updatedAt: new Date().toISOString(),
    lastKnownServerUpdatedAt: input.lastKnownServerUpdatedAt ?? null,
  };
  await putOfflineRecord(OFFLINE_DB_STORES.caseDrafts, draft);
  return draft;
}

export function getOfflineCaseDraft(localCaseId: string) {
  return getOfflineRecord<OfflineCaseDraft>(OFFLINE_DB_STORES.caseDrafts, localCaseId);
}

export function listOfflineCaseDrafts() {
  return getAllOfflineRecords<OfflineCaseDraft>(OFFLINE_DB_STORES.caseDrafts);
}

export async function getLatestOfflineCreateDraft() {
  const drafts = await listOfflineCaseDrafts();
  return drafts
    .filter((draft) => !draft.serverCaseId && draft.localCaseId.startsWith("offline-"))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null;
}

export function deleteOfflineCaseDraft(localCaseId: string) {
  return deleteOfflineRecord(OFFLINE_DB_STORES.caseDrafts, localCaseId);
}

export async function markOfflineCaseDraftSynced(localCaseId: string, serverCaseId: string, syncedAt?: string) {
  const draft = await getOfflineCaseDraft(localCaseId);
  if (!draft) return null;
  const nextDraft: OfflineCaseDraft = {
    ...draft,
    serverCaseId,
    syncStatus: "synced",
    updatedAt: syncedAt ?? new Date().toISOString(),
  };
  await putOfflineRecord(OFFLINE_DB_STORES.caseDrafts, nextDraft);
  markOfflineSynced(nextDraft.updatedAt);
  return nextDraft;
}
