export const CURRENT_CASE_DIVISIONS = [
  "本部機動",
  "1方面",
  "2方面",
  "3方面",
  "4方面",
  "5方面",
  "6方面",
  "7方面",
  "8方面",
  "9方面",
  "10方面",
] as const;

export type CurrentCaseDivision = (typeof CURRENT_CASE_DIVISIONS)[number];

export function isCurrentCaseDivision(value: unknown): value is CurrentCaseDivision {
  return typeof value === "string" && CURRENT_CASE_DIVISIONS.includes(value as CurrentCaseDivision);
}

export function getDefaultCaseDivision(): CurrentCaseDivision {
  return "本部機動";
}
