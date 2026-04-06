import type {
  OfflineConflictResult,
  OfflineConflictSummary,
  OfflineFieldGroup,
} from "@/lib/offline/offlineTypes";

const FIELD_GROUPS: OfflineFieldGroup[] = ["basic", "summary", "findingsV2", "sendHistory"];

function normalizeGroupValue(payload: unknown, group: OfflineFieldGroup) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const value = record[group];
  return value === undefined ? null : value;
}

function getChangedGroups(basePayload: unknown, targetPayload: unknown) {
  return FIELD_GROUPS.filter(
    (group) => JSON.stringify(normalizeGroupValue(basePayload, group)) !== JSON.stringify(normalizeGroupValue(targetPayload, group)),
  );
}

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

export function classifyOfflineConflict(basePayload: unknown, localPayload: unknown, serverPayload: unknown): OfflineConflictSummary {
  const localGroups = getChangedGroups(basePayload, localPayload);
  const serverGroups = getChangedGroups(basePayload, serverPayload);

  if (localGroups.length === 0 && serverGroups.length === 0) {
    return {
      type: "requires_review",
      localGroups,
      serverGroups,
      reason: "変更差分を特定できないため、内容確認が必要です。",
    };
  }

  if (serverGroups.length === 0) {
    return {
      type: "local_only_changed",
      localGroups,
      serverGroups,
      reason: "ローカル下書きのみが更新されています。内容確認後に再保存できます。",
    };
  }

  if (localGroups.length === 0) {
    return {
      type: "server_only_changed",
      localGroups,
      serverGroups,
      reason: "サーバー側のみ更新されています。server を採用して整理するのが安全です。",
    };
  }

  const hasOverlap = localGroups.some((group) => serverGroups.includes(group));
  if (hasOverlap) {
    return {
      type: "both_changed_same_field",
      localGroups,
      serverGroups,
      reason: "同じ項目群がサーバーとローカルの両方で更新されています。自動マージせず確認が必要です。",
    };
  }

  return {
    type: "both_changed_different_fields",
    localGroups,
    serverGroups,
    reason: "異なる項目群が更新されていますが、初期段階では自動マージせず確認を求めます。",
  };
}
