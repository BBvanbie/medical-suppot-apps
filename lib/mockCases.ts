import type { CurrentCaseDivision } from "@/lib/caseDivision";

export type CaseRecord = {
  caseId: string;
  division: CurrentCaseDivision;
  awareDate: string;
  awareTime: string;
  address: string;
  name: string;
  age: number;
  destination?: string;
  symptom: string;
  triageLevel: "high" | "mid" | "low";
  note: string;
};
