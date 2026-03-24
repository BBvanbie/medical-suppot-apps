import { randomUUID } from "node:crypto";

export const TEAM_CASE_NUMBER_CODE_WIDTH = 3;
export const TEAM_DAILY_CASE_SEQUENCE_WIDTH = 2;

export function createCaseUid() {
  return `case_${randomUUID()}`;
}

export function formatTeamCaseNumberCode(value: number) {
  return String(value).padStart(TEAM_CASE_NUMBER_CODE_WIDTH, "0");
}

export function formatDispatchCaseId(dateKey: string, teamCaseNumberCode: string, sequence: number) {
  return `${dateKey}-${teamCaseNumberCode}-${String(sequence).padStart(TEAM_DAILY_CASE_SEQUENCE_WIDTH, "0")}`;
}
