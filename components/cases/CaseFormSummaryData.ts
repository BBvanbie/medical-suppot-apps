"use client";

import { renderChangedDetail } from "@/components/cases/CaseFindingSummary";
import type { CaseFindingSectionDefinition, CaseFindings } from "@/lib/caseFindingsSchema";
import { buildChangedFindingsSummary } from "@/lib/caseFindingsSummary";

type VitalSummaryInput = {
  measuredAt: string;
  consciousnessType: "jcs" | "gcs";
  consciousnessValue: string;
  respiratoryRate: string;
  pulseRate: string;
  ecg: string;
  spo2: string;
  pupilRight: string;
  pupilLeft: string;
  lightReflexRight: string;
  lightReflexLeft: string;
  temperature: string;
  temperatureUnavailable: boolean;
};

export function buildCaseSummaryData(params: {
  caseId: string;
  nameUnknown: boolean;
  name: string;
  gender: "male" | "female" | "unknown";
  birthSummary: string;
  age: string;
  address: string;
  phone: string;
  adl: string;
  allergy: string;
  dnarSummary: string;
  weight: string;
  relatedPeople: Array<{ name: string; relation: string; phone: string }>;
  pastHistories: Array<{ disease: string; clinic: string }>;
  vitals: VitalSummaryInput[];
  findingSectionsV2: readonly CaseFindingSectionDefinition[];
  findingsV2: CaseFindings;
  asSummaryValue: (value: string) => string;
}) {
  const latestVital = params.vitals[params.vitals.length - 1];
  const findingsSummary = buildChangedFindingsSummary(params.findingSectionsV2, params.findingsV2);
  const formatWithUnit = (value: string, unit: string) => {
    const normalized = params.asSummaryValue(value);
    return normalized === "-" ? normalized : `${normalized}${unit}`;
  };
  const formatConsciousness = (vital: VitalSummaryInput) => {
    const prefix = vital.consciousnessType === "jcs" ? "JCS" : "GCS";
    const value = String(vital.consciousnessValue ?? "").trim();
    return `${prefix} ${value || "-"}`;
  };
  const formatPupilSide = (size: string, reflex: string) => {
    const normalized = params.asSummaryValue(size);
    if (normalized === "-") return normalized;
    return `${normalized}${reflex === "??" ? "-" : "+"}`;
  };
  const formatPupilBoth = (vital: VitalSummaryInput) => {
    const right = formatPupilSide(vital.pupilRight, vital.lightReflexRight);
    const left = formatPupilSide(vital.pupilLeft, vital.lightReflexLeft);
    if (right === "-" && left === "-") return "-";
    return `${right}/${left}`;
  };
  const formatTemperature = (vital: VitalSummaryInput) =>
    vital.temperatureUnavailable ? "????" : params.asSummaryValue(vital.temperature);

  return {
    basicFields: [
      { label: "??ID", value: params.caseId, className: "md:col-span-2" },
      { label: "??", value: params.nameUnknown ? "??" : params.asSummaryValue(params.name), className: "md:col-span-3" },
      {
        label: "??",
        value: params.gender === "male" ? "??" : params.gender === "female" ? "??" : "??",
        className: "md:col-span-2",
      },
      { label: "????", value: params.birthSummary, className: "md:col-span-3" },
      { label: "??", value: params.asSummaryValue(params.age), className: "md:col-span-2" },
      { label: "??", value: params.asSummaryValue(params.address), className: "md:col-span-8" },
      { label: "????", value: params.asSummaryValue(params.phone), className: "md:col-span-4" },
      { label: "ADL", value: params.asSummaryValue(params.adl), className: "md:col-span-3" },
      { label: "?????", value: params.asSummaryValue(params.allergy), className: "md:col-span-4" },
      { label: "DNAR", value: params.asSummaryValue(params.dnarSummary), className: "md:col-span-2" },
      { label: "??(kg)", value: params.asSummaryValue(params.weight), className: "md:col-span-3" },
    ],
    relatedPeople: params.relatedPeople.map((person) => ({
      name: String(person.name ?? "").trim() || "-",
      relation: String(person.relation ?? "").trim() || "-",
      phone: String(person.phone ?? "").trim() || "-",
    })),
    pastHistories: params.pastHistories.map((item) => ({
      disease: String(item.disease ?? "").trim() || "-",
      clinic: String(item.clinic ?? "").trim() || "-",
    })),
    latestVitalTitle: `?????? (${params.asSummaryValue(latestVital?.measuredAt ?? "")})`,
    latestVitalLine: latestVital
      ? `??: ${formatConsciousness(latestVital)} / ???: ${formatWithUnit(latestVital.respiratoryRate, "?")} / ???: ${formatWithUnit(latestVital.pulseRate, "?")} / SpO2: ${formatWithUnit(latestVital.spo2, "%")} / ??: ${formatPupilBoth(latestVital)} / ??: ${formatTemperature(latestVital)} / ???: ${params.asSummaryValue(latestVital.ecg)}`
      : "-",
    vitalCards: params.vitals.map((vital, idx) => ({
      id: `summary-vital-${idx}`,
      title: `${idx + 1}?? (${params.asSummaryValue(vital.measuredAt)})`,
      lines: [
        `??: ${formatConsciousness(vital)}`,
        `???: ${formatWithUnit(vital.respiratoryRate, "?")} / ???: ${formatWithUnit(vital.pulseRate, "?")} / ???: ${params.asSummaryValue(vital.ecg)}`,
        `SpO2: ${formatWithUnit(vital.spo2, "%")}`,
        `??: ${formatPupilBoth(vital)} / ??: ${formatTemperature(vital)}`,
      ],
    })),
    changedFindings: findingsSummary.changedFindings,
    changedFindingDetails: findingsSummary.changedFindingDetails.map((item) => ({
      ...item,
      detail: renderChangedDetail(item.detail),
    })),
  };
}
