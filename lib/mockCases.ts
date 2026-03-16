export type CaseRecord = {
  caseId: string;
  division: "1\u90e8" | "2\u90e8" | "3\u90e8";
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
