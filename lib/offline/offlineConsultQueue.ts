import { getAllOfflineRecords, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import { refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineQueueItem } from "@/lib/offline/offlineTypes";

function createQueueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type OfflineConsultMessage = {
  id: string;
  actor: "A";
  actedAt: string;
  note: string;
  localStatus: "未送信" | "送信待ち" | "競合" | "送信失敗";
};

export async function enqueueConsultReply(input: {
  targetId: number;
  localCaseId?: string;
  serverCaseId?: string;
  note: string;
  baseServerUpdatedAt?: string | null;
}) {
  const timestamp = new Date().toISOString();
  const item: OfflineQueueItem = {
    id: createQueueId("consult"),
    type: "consult_reply",
    localCaseId: input.localCaseId,
    serverCaseId: input.serverCaseId,
    targetId: String(input.targetId),
    payload: { note: input.note, targetId: input.targetId },
    createdAt: timestamp,
    updatedAt: timestamp,
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

export async function listOfflineConsultMessages(targetId: number) {
  const items = await getAllOfflineRecords<OfflineQueueItem>(OFFLINE_DB_STORES.offlineQueue);
  return items
    .filter((item) => item.type === "consult_reply" && Number(item.targetId) === targetId)
    .map<OfflineConsultMessage>((item) => ({
      id: item.id,
      actor: "A",
      actedAt: item.createdAt,
      note: typeof (item.payload as { note?: unknown })?.note === "string" ? (item.payload as { note: string }).note : "",
      localStatus:
        item.status === "conflict"
          ? "競合"
          : item.status === "failed"
            ? "送信失敗"
            : item.status === "sending"
              ? "送信待ち"
              : "未送信",
    }));
}
