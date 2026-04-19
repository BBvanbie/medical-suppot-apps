"use client";

import { CaseFormSummaryTab } from "@/components/cases/CaseFormSummaryTab";
import { buildCaseSummaryData } from "@/components/cases/CaseFormSummaryData";
import { CASE_FINDING_SECTIONS_V2 } from "@/lib/caseFindingsConfig";
import type { CaseFindings } from "@/lib/caseFindingsSchema";

type RelatedPerson = {
  name: string;
  relation: string;
  phone: string;
};

type PastHistory = {
  disease: string;
  clinic: string;
};

type VitalSet = {
  measuredAt: string;
  consciousnessType: "jcs" | "gcs";
  consciousnessValue: string;
  respiratoryRate: string;
  respiratoryPattern: string;
  breathOdor: string;
  pulseRate: string;
  ecg: string;
  arrhythmia: "yes" | "no" | "unknown";
  bpRightSystolic: string;
  bpRightDiastolic: string;
  bpLeftSystolic: string;
  bpLeftDiastolic: string;
  spo2: string;
  pupilRight: string;
  pupilLeft: string;
  lightReflexRight: string;
  lightReflexLeft: string;
  gazeRight: string;
  gazeLeft: string;
  temperature: string;
  temperatureUnavailable: boolean;
};

type CaseFormSummaryPaneProps = {
  caseId: string;
  nameUnknown: boolean;
  name: string;
  gender: "male" | "female" | "unknown";
  birthSummary: string;
  incidentType: string;
  ageSummary: string;
  address: string;
  phone: string;
  adl: string;
  allergy: string;
  dnarSummary: string;
  weight: string;
  relatedPeople: RelatedPerson[];
  pastHistories: PastHistory[];
  specialNote: string;
  dispatchSummary: string;
  chiefComplaint: string;
  vitals: VitalSet[];
  findingsV2: CaseFindings;
};

function asSummaryValue(value: unknown) {
  if (value === null || value === undefined) return "未入力";
  if (typeof value === "string") return value.trim() ? value : "未入力";
  return String(value);
}

export function CaseFormSummaryPane({
  caseId,
  nameUnknown,
  name,
  gender,
  birthSummary,
  incidentType,
  ageSummary,
  address,
  phone,
  adl,
  allergy,
  dnarSummary,
  weight,
  relatedPeople,
  pastHistories,
  specialNote,
  dispatchSummary,
  chiefComplaint,
  vitals,
  findingsV2,
}: CaseFormSummaryPaneProps) {
  const summaryData = buildCaseSummaryData({
    caseId,
    nameUnknown,
    name,
    gender,
    birthSummary,
    incidentType,
    age: ageSummary,
    address,
    phone,
    adl,
    allergy,
    dnarSummary,
    weight,
    relatedPeople,
    pastHistories,
    vitals,
    findingSectionsV2: CASE_FINDING_SECTIONS_V2,
    findingsV2,
    asSummaryValue,
  });

  return (
    <CaseFormSummaryTab
      headerText="基本情報・要請概要・バイタル・変更所見を一画面で確認します。"
      basicFields={summaryData.basicFields}
      relatedPeople={summaryData.relatedPeople}
      pastHistories={summaryData.pastHistories}
      specialNote={asSummaryValue(specialNote)}
      dispatchSummary={asSummaryValue(dispatchSummary)}
      chiefComplaint={asSummaryValue(chiefComplaint)}
      latestVitalTitle={summaryData.latestVitalTitle}
      latestVitalLine={summaryData.latestVitalLine}
      vitalCards={summaryData.vitalCards}
      changedFindings={summaryData.changedFindings}
      changedFindingDetails={summaryData.changedFindingDetails}
    />
  );
}
