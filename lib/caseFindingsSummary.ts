import type {
  CaseFindingDetailDefinition,
  CaseFindingItemDefinition,
  CaseFindingSectionDefinition,
  CaseFindings,
  CaseFindingItem,
  FindingState,
} from "@/lib/caseFindingsSchema";

export type ChangedFindingEntry = {
  major: string;
  middle: string;
  detail: string;
};

export type ParsedChangedFindingDetail = {
  status: string | null;
  fields: Array<{ label: string; value: string }>;
};

const CHANGED_FINDING_DETAIL_PREFIX = "json:";

function formatStateLabel(state: FindingState): string {
  switch (state) {
    case "positive":
      return "＋";
    case "negative":
      return "－";
    case "unable":
      return "確認困難";
    default:
      return "";
  }
}

function formatDurationMinutes(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  const match = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return normalized;
  const minutes = Number(match[1] ?? "0");
  const seconds = Number(match[2] ?? "0");
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return normalized;
  const approxMinutes = Math.max(1, minutes + (seconds > 0 ? 1 : 0));
  return `約${approxMinutes}分`;
}

function formatDetailValue(detailDef: CaseFindingDetailDefinition, rawValue: unknown): string {
  if (Array.isArray(rawValue)) {
    return rawValue.filter((value) => typeof value === "string" && value.trim() !== "").join("、");
  }

  if (typeof rawValue !== "string") return "";
  const normalized = rawValue.trim();
  if (!normalized) return "";

  if (detailDef.summaryFormat === "duration-minutes") {
    return formatDurationMinutes(normalized);
  }

  return normalized;
}

function hasDetailValue(rawValue: unknown): boolean {
  if (Array.isArray(rawValue)) return rawValue.some((value) => typeof value === "string" && value.trim() !== "");
  return typeof rawValue === "string" && rawValue.trim() !== "";
}

function matchesShowWhen(detailDef: CaseFindingDetailDefinition, item: CaseFindingItem): boolean {
  if (!detailDef.showWhen) return true;
  const dependency = item.details[detailDef.showWhen.detailId];
  if (detailDef.showWhen.equals !== undefined) {
    return dependency === detailDef.showWhen.equals;
  }
  if (detailDef.showWhen.includes !== undefined) {
    return Array.isArray(dependency) && dependency.includes(detailDef.showWhen.includes);
  }
  return true;
}

export function isFindingDetailVisible(itemId: string, detailDef: CaseFindingDetailDefinition, item: CaseFindingItem): boolean {
  if (item.state !== "positive") return false;
  if (!matchesShowWhen(detailDef, item)) return false;

  switch (`${itemId}:${detailDef.id}`) {
    case "chest-pain:radiationDestination":
      return item.details.radiation === "positive";
    case "back-pain:movingPainDestination":
      return item.details.movingPain === "positive";
    case "palpitation:diagnosis":
      return item.details.visitHistory === "positive";
    default:
      return true;
  }
}

function buildStructuredChangedFindingDetail(itemDef: CaseFindingItemDefinition, item: CaseFindingItem): ParsedChangedFindingDetail {
  const fields: ParsedChangedFindingDetail["fields"] = [];

  if (item.state === "positive") {
    for (const detailDef of itemDef.details) {
      if (!isFindingDetailVisible(itemDef.id, detailDef, item)) continue;
      const rawValue = item.details[detailDef.id];

      if (detailDef.kind === "state") {
        if (rawValue === "unselected") continue;
        fields.push({ label: detailDef.label, value: formatStateLabel(rawValue as FindingState) });
        continue;
      }

      if (!hasDetailValue(rawValue)) continue;
      fields.push({ label: detailDef.label, value: formatDetailValue(detailDef, rawValue) });
    }
  }

  return {
    status: formatStateLabel(item.state) || null,
    fields,
  };
}

function serializeChangedFindingDetail(detail: ParsedChangedFindingDetail): string {
  return `${CHANGED_FINDING_DETAIL_PREFIX}${JSON.stringify(detail)}`;
}

export function parseChangedFindingDetail(detail: string): ParsedChangedFindingDetail | null {
  if (!detail.startsWith(CHANGED_FINDING_DETAIL_PREFIX)) return null;

  try {
    const parsed = JSON.parse(detail.slice(CHANGED_FINDING_DETAIL_PREFIX.length)) as ParsedChangedFindingDetail;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.status !== null && typeof parsed.status !== "string") return null;
    if (!Array.isArray(parsed.fields)) return null;

    const fields = parsed.fields.filter(
      (field): field is { label: string; value: string } =>
        Boolean(field) &&
        typeof field === "object" &&
        typeof field.label === "string" &&
        typeof field.value === "string",
    );

    if (fields.length !== parsed.fields.length) return null;

    return {
      status: parsed.status,
      fields,
    };
  } catch {
    return null;
  }
}

export function buildChangedFindingsSummary(
  sections: readonly CaseFindingSectionDefinition[],
  findings: CaseFindings,
) {
  const payloadEntries: ChangedFindingEntry[] = [];

  const changedFindings = sections.map((section) => {
    let changedCount = 0;

    for (const itemDef of section.items) {
      const item = findings[section.id]?.[itemDef.id];
      if (!item || item.state === "unselected") continue;
      changedCount += 1;
      payloadEntries.push({
        major: section.label,
        middle: itemDef.label,
        detail: serializeChangedFindingDetail(buildStructuredChangedFindingDetail(itemDef, item)),
      });
    }

    return {
      id: section.id,
      label: section.label,
      changedCount,
    };
  });

  const changedFindingDetails = payloadEntries.map((entry, index) => ({
    id: `changed-finding-v2-${index}`,
    major: entry.major,
    middle: entry.middle,
    detail: entry.detail,
  }));

  return {
    changedFindings,
    changedFindingDetails,
    payloadEntries,
  };
}
