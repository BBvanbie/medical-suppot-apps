import type {
  OfflineConflictFieldDiff,
  OfflineConflictGroupDiff,
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

function stringifyValue(value: unknown) {
  if (value === undefined) return "未設定";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function flattenValueEntries(value: unknown, prefix = ""): Record<string, string> {
  if (Array.isArray(value)) {
    return { [prefix || "(array)"]: stringifyValue(value) };
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return { [prefix || "(empty)"]: "{}" };
    }

    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .reduce<Record<string, string>>((accumulator, [key, nestedValue]) => {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        return { ...accumulator, ...flattenValueEntries(nestedValue, nextPrefix) };
      }, {});
  }

  return { [prefix || "(value)"]: stringifyValue(value) };
}

export function buildOfflineConflictGroupDiffs(
  basePayload: unknown,
  localPayload: unknown,
  serverPayload: unknown,
): OfflineConflictGroupDiff[] {
  return FIELD_GROUPS.map((group) => {
    const baseEntries = flattenValueEntries(normalizeGroupValue(basePayload, group));
    const localEntries = flattenValueEntries(normalizeGroupValue(localPayload, group));
    const serverEntries = flattenValueEntries(normalizeGroupValue(serverPayload, group));
    const allPaths = Array.from(new Set([...Object.keys(baseEntries), ...Object.keys(localEntries), ...Object.keys(serverEntries)])).sort((left, right) =>
      left.localeCompare(right),
    );

    const fields: OfflineConflictFieldDiff[] = allPaths
      .map((path) => {
        const baseValue = baseEntries[path] ?? "未設定";
        const localValue = localEntries[path] ?? "未設定";
        const serverValue = serverEntries[path] ?? "未設定";
        return {
          path,
          baseValue,
          localValue,
          serverValue,
          changedInLocal: baseValue !== localValue,
          changedInServer: baseValue !== serverValue,
        };
      })
      .filter((field) => field.changedInLocal || field.changedInServer);

    return { group, fields };
  }).filter((group) => group.fields.length > 0);
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
