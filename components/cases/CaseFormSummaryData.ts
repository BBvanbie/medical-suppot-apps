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
  incidentType: string;
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
    vital.temperatureUnavailable ? "測定不可" : params.asSummaryValue(vital.temperature);

  return {
    basicFields: [
      { label: "事案ID", value: params.caseId, className: "md:col-span-2" },
      { label: "氏名", value: params.nameUnknown ? "不詳" : params.asSummaryValue(params.name), className: "md:col-span-3" },
      {
        label: "性別",
        value:
          params.gender === "male"
            ? "男性"
            : params.gender === "female"
              ? "女性"
              : "不明",
        className: "md:col-span-2",
      },
      { label: "生年月日", value: params.birthSummary, className: "md:col-span-3" },
      { label: "事案種別", value: params.asSummaryValue(params.incidentType), className: "md:col-span-2" },
      { label: "年齢", value: params.asSummaryValue(params.age), className: "md:col-span-2" },
      { label: "住所", value: params.asSummaryValue(params.address), className: "md:col-span-8" },
      { label: "電話番号", value: params.asSummaryValue(params.phone), className: "md:col-span-4" },
      { label: "ADL", value: params.asSummaryValue(params.adl), className: "md:col-span-3" },
      { label: "アレルギー", value: params.asSummaryValue(params.allergy), className: "md:col-span-4" },
      { label: "DNAR", value: params.asSummaryValue(params.dnarSummary), className: "md:col-span-2" },
      { label: "体重(kg)", value: params.asSummaryValue(params.weight), className: "md:col-span-3" },
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
    latestVitalTitle: `最新バイタル (${params.asSummaryValue(latestVital?.measuredAt ?? "")})`,
    latestVitalLine: latestVital
      ? `意識: ${formatConsciousness(latestVital)} / 呼吸数: ${formatWithUnit(latestVital.respiratoryRate, "回")} / 脈拍数: ${formatWithUnit(latestVital.pulseRate, "回")} / SpO2: ${formatWithUnit(latestVital.spo2, "%")} / 瞳孔: ${formatPupilBoth(latestVital)} / 体温: ${formatTemperature(latestVital)} / 心電図: ${params.asSummaryValue(latestVital.ecg)}`
      : "-",
    vitalCards: params.vitals.map((vital, idx) => ({
      id: `summary-vital-${idx}`,
      title: `${idx + 1}件目 (${params.asSummaryValue(vital.measuredAt)})`,
      lines: [
        `意識: ${formatConsciousness(vital)}`,
        `呼吸数: ${formatWithUnit(vital.respiratoryRate, "回")} / 脈拍数: ${formatWithUnit(vital.pulseRate, "回")} / 心電図: ${params.asSummaryValue(vital.ecg)}`,
        `SpO2: ${formatWithUnit(vital.spo2, "%")}`,
        `瞳孔: ${formatPupilBoth(vital)} / 体温: ${formatTemperature(vital)}`,
      ],
    })),
    changedFindings: findingsSummary.changedFindings,
    changedFindingDetails: findingsSummary.changedFindingDetails.map((item) => ({
      ...item,
      detail: renderChangedDetail(item.detail),
    })),
  };
}
