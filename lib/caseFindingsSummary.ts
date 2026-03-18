import type {
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

function formatStateLabel(state: FindingState): string {
  switch (state) {
    case "positive":
      return "\uff0b";
    case "negative":
      return "\uff0d";
    case "unable":
      return "\u78ba\u8a8d\u56f0\u96e3";
    default:
      return "";
  }
}

function hasTextValue(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function isFindingDetailVisible(itemId: string, detailId: string, item: CaseFindingItem): boolean {
  if (item.state !== "positive") return false;

  switch (`${itemId}:${detailId}`) {
    case "chest-pain:radiationDestination":
      return item.details.radiation === "positive";
    case "back-pain:movingPainDestination":
      return item.details.movingPain === "positive";
    case "palpitation:diagnosis":
      return item.details.visitHistory === "positive";
    case "convulsion:type":
      return item.state === "positive";
    default:
      return true;
  }
}

function buildItemDetailTokens(itemDef: CaseFindingItemDefinition, item: CaseFindingItem): string[] {
  const tokens = [`\u72b6\u614b:${formatStateLabel(item.state)}`];
  if (item.state !== "positive") return tokens;

  for (const detailDef of itemDef.details) {
    if (!isFindingDetailVisible(itemDef.id, detailDef.id, item)) continue;
    const rawValue = item.details[detailDef.id];

    if (detailDef.kind === "state") {
      if (rawValue === "unselected") continue;
      tokens.push(`${detailDef.label}:${formatStateLabel(rawValue as FindingState)}`);
      continue;
    }

    if (!hasTextValue(rawValue)) continue;
    tokens.push(`${detailDef.label}:${String(rawValue).trim()}`);
  }

  return tokens;
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
        detail: buildItemDetailTokens(itemDef, item).join(" "),
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
