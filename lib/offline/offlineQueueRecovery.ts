import type { OfflineFailureKind, OfflineQueueItem, OfflineRecoveryAction } from "@/lib/offline/offlineTypes";

export type OfflineFailureMeta = {
  kind: OfflineFailureKind;
  recoveryAction: OfflineRecoveryAction;
  message: string;
};

export function classifyOfflineHttpFailure(status: number, fallbackMessage: string): OfflineFailureMeta {
  if (status === 409) {
    return { kind: "conflict", recoveryAction: "review", message: fallbackMessage };
  }

  if (status >= 400 && status < 500) {
    return { kind: "validation", recoveryAction: status === 404 ? "discard" : "review", message: fallbackMessage };
  }

  if (status >= 500) {
    return { kind: "server", recoveryAction: "retry", message: fallbackMessage };
  }

  return { kind: "unknown", recoveryAction: "review", message: fallbackMessage };
}

export function classifyOfflineException(error: unknown, fallbackMessage: string): OfflineFailureMeta {
  const message = error instanceof Error && error.message ? error.message : fallbackMessage;
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("load failed") ||
    normalized.includes("fetch")
  ) {
    return { kind: "network", recoveryAction: "retry", message };
  }

  return { kind: "unknown", recoveryAction: "review", message };
}

export function getOfflineFailureLabel(kind?: OfflineFailureKind | null) {
  switch (kind) {
    case "network":
      return "通信失敗";
    case "server":
      return "サーバー失敗";
    case "validation":
      return "内容確認";
    case "conflict":
      return "競合";
    default:
      return "要確認";
  }
}

export function getOfflineRecoveryActionLabel(action?: OfflineRecoveryAction | null) {
  switch (action) {
    case "retry":
      return "再送";
    case "review":
      return "内容確認";
    case "discard":
      return "不要なら破棄";
    default:
      return "確認";
  }
}

export function canRetryOfflineQueueItem(item: OfflineQueueItem) {
  if (item.status === "conflict") return false;
  if (item.recoveryAction === "discard") return false;
  return true;
}