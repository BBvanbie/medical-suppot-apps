import { countOfflineRecords, OFFLINE_DB_STORES } from "@/lib/offline/offlineDb";
import type { OfflineMode, OfflineSnapshot } from "@/lib/offline/offlineTypes";

type OfflineListener = (snapshot: OfflineSnapshot) => void;

const listeners = new Set<OfflineListener>();

let snapshot: OfflineSnapshot = {
  mode: "online",
  pendingQueueCount: 0,
  hasReconnectNotice: false,
  lastSyncAt: null,
  consecutiveFailures: 0,
};

function emit() {
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function getOfflineSnapshot() {
  return snapshot;
}

export function subscribeOfflineSnapshot(listener: OfflineListener) {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function setOfflineSnapshot(partial: Partial<OfflineSnapshot>) {
  snapshot = { ...snapshot, ...partial };
  emit();
}

export function setOfflineMode(mode: OfflineMode) {
  const hasReconnectNotice = mode === "reconnected" ? snapshot.pendingQueueCount > 0 : snapshot.hasReconnectNotice;
  snapshot = { ...snapshot, mode, hasReconnectNotice };
  emit();
}

export function clearReconnectNotice() {
  if (!snapshot.hasReconnectNotice) return;
  snapshot = { ...snapshot, hasReconnectNotice: false };
  emit();
}

export function markOfflineRequestFailure() {
  const consecutiveFailures = snapshot.consecutiveFailures + 1;
  snapshot = { ...snapshot, consecutiveFailures };
  emit();
}

export function markOfflineRequestSuccess() {
  const nextMode = snapshot.mode === "reconnected" ? "online" : snapshot.mode === "offline" ? "offline" : "online";
  snapshot = { ...snapshot, consecutiveFailures: 0, mode: nextMode };
  emit();
}

export async function refreshOfflineQueueCount() {
  try {
    const pendingQueueCount = await countOfflineRecords(OFFLINE_DB_STORES.offlineQueue);
    snapshot = {
      ...snapshot,
      pendingQueueCount,
      hasReconnectNotice: snapshot.mode === "reconnected" && pendingQueueCount > 0,
    };
    emit();
  } catch {
    // Ignore IndexedDB failures and keep in-memory state.
  }
}

export function markOfflineSynced(at = new Date().toISOString()) {
  snapshot = { ...snapshot, lastSyncAt: at };
  emit();
}
