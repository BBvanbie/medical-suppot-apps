export const FINDING_STATES = ["unselected", "positive", "negative", "unable"] as const;

export type FindingState = (typeof FINDING_STATES)[number];
export type FindingDetailKind = "state" | "select" | "number" | "time" | "text";
export type FindingDetailValue = FindingState | string;
export type CaseFindings = Record<string, CaseFindingSection>;
export type CaseFindingSection = Record<string, CaseFindingItem>;

export type CaseFindingDetailDefinition = {
  id: string;
  label: string;
  kind: FindingDetailKind;
  options?: readonly string[];
};

export type CaseFindingItemDefinition = {
  id: string;
  label: string;
  details: readonly CaseFindingDetailDefinition[];
};

export type CaseFindingSectionDefinition = {
  id: string;
  label: string;
  items: readonly CaseFindingItemDefinition[];
};

export type CaseFindingItem = {
  state: FindingState;
  details: Record<string, FindingDetailValue>;
};

export function isFindingState(value: unknown): value is FindingState {
  return typeof value === "string" && (FINDING_STATES as readonly string[]).includes(value);
}
