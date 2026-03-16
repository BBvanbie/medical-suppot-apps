import type { OfflineConflictResult } from "@/lib/offline/offlineTypes";

export function detectOfflineConflict(baseServerUpdatedAt?: string | null, latestServerUpdatedAt?: string | null): OfflineConflictResult {
  if (!baseServerUpdatedAt || !latestServerUpdatedAt) {
    return { conflict: false };
  }

  return baseServerUpdatedAt === latestServerUpdatedAt
    ? { conflict: false }
    : {
        conflict: true,
        reason: "サーバー側の更新時刻が変わっているため、自動同期を停止しました。",
      };
}
