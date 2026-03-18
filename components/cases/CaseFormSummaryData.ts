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
    return `${normalized}${reflex === "?" ? "-" : "+"}`;
  };

  const formatPupilBoth = (vital: VitalSummaryInput) => {
    const right = formatPupilSide(vital.pupilRight, vital.lightReflexRight);
    const left = formatPupilSide(vital.pupilLeft, vital.lightReflexLeft);
    if (right === "-" && left === "-") return "-";
    return `${right}/${left}`;
  };

  const formatTemperature = (vital: VitalSummaryInput) =>
    vital.temperatureUnavailable ? "\u6e2c\u5b9a\u4e0d\u53ef" : params.asSummaryValue(vital.temperature);

  return {
    basicFields: [
      { label: "\u4e8b\u6848ID", value: params.caseId, className: "md:col-span-2" },
      { label: "\u6c0f\u540d", value: params.nameUnknown ? "\u4e0d\u8a73" : params.asSummaryValue(params.name), className: "md:col-span-3" },
      {
        label: "\u6027\u5225",
        value:
          params.gender === "male"
            ? "\u7537\u6027"
            : params.gender === "female"
              ? "\u5973\u6027"
              : "\u4e0d\u660e",
        className: "md:col-span-2",
      },
      { label: "\u751f\u5e74\u6708\u65e5", value: params.birthSummary, className: "md:col-span-3" },
      { label: "\u5e74\u9f62", value: params.asSummaryValue(params.age), className: "md:col-span-2" },
      { label: "\u4f4f\u6240", value: params.asSummaryValue(params.address), className: "md:col-span-8" },
      { label: "\u96fb\u8a71\u756a\u53f7", value: params.asSummaryValue(params.phone), className: "md:col-span-4" },
      { label: "ADL", value: params.asSummaryValue(params.adl), className: "md:col-span-3" },
      { label: "\u30a2\u30ec\u30eb\u30ae\u30fc", value: params.asSummaryValue(params.allergy), className: "md:col-span-4" },
      { label: "DNAR", value: params.asSummaryValue(params.dnarSummary), className: "md:col-span-2" },
      { label: "\u4f53\u91cd(kg)", value: params.asSummaryValue(params.weight), className: "md:col-span-3" },
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
    latestVitalTitle: `\u6700\u65b0\u30d0\u30a4\u30bf\u30eb (${params.asSummaryValue(latestVital?.measuredAt ?? "")})`,
    latestVitalLine: latestVital
      ? `\u610f\u8b58: ${formatConsciousness(latestVital)} / \u547c\u5438\u6570: ${formatWithUnit(latestVital.respiratoryRate, "\u56de")} / \u8108\u62cd\u6570: ${formatWithUnit(latestVital.pulseRate, "\u56de")} / SpO2: ${formatWithUnit(latestVital.spo2, "%")} / \u77b3\u5b54: ${formatPupilBoth(latestVital)} / \u4f53\u6e29: ${formatTemperature(latestVital)} / \u5fc3\u96fb\u56f3: ${params.asSummaryValue(latestVital.ecg)}`
      : "-",
    vitalCards: params.vitals.map((vital, idx) => ({
      id: `summary-vital-${idx}`,
      title: `${idx + 1}\u4ef6\u76ee (${params.asSummaryValue(vital.measuredAt)})`,
      lines: [
        `\u610f\u8b58: ${formatConsciousness(vital)}`,
        `\u547c\u5438\u6570: ${formatWithUnit(vital.respiratoryRate, "\u56de")} / \u8108\u62cd\u6570: ${formatWithUnit(vital.pulseRate, "\u56de")} / \u5fc3\u96fb\u56f3: ${params.asSummaryValue(vital.ecg)}`,
        `SpO2: ${formatWithUnit(vital.spo2, "%")}`,
        `\u77b3\u5b54: ${formatPupilBoth(vital)} / \u4f53\u6e29: ${formatTemperature(vital)}`,
      ],
    })),
    changedFindings: findingsSummary.changedFindings,
    changedFindingDetails: findingsSummary.changedFindingDetails.map((item) => ({
      ...item,
      detail: renderChangedDetail(item.detail),
    })),
  };
}
