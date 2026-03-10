export type CaseRecord = {
  caseId: string;
  division: "1驛ｨ" | "2驛ｨ" | "3驛ｨ";
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
