import { CASE_FINDING_SECTIONS_V2 } from "@/lib/caseFindingsConfig";
import { normalizeCaseFindings } from "@/lib/caseFindingsNormalizer";
import { buildChangedFindingsSummary, type ChangedFindingEntry } from "@/lib/caseFindingsSummary";

type SummaryRecord = Record<string, unknown>;

function asChangedFindingEntries(value: unknown): ChangedFindingEntry[] | null {
  if (!Array.isArray(value)) return null;

  const entries = value.filter(
    (item): item is ChangedFindingEntry =>
      Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof (item as ChangedFindingEntry).major === "string" &&
      typeof (item as ChangedFindingEntry).middle === "string" &&
      typeof (item as ChangedFindingEntry).detail === "string",
  );

  return entries.length === value.length ? entries : null;
}

function asObject(value: unknown): SummaryRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as SummaryRecord) : {};
}

export function pickPatientSummaryFromCasePayload(casePayload: unknown): SummaryRecord {
  const payload = asObject(casePayload);

  const fromCaseContext = asObject(payload.caseContext);
  if (Object.keys(fromCaseContext).length > 0) return fromCaseContext;

  const fromPatientSummary = asObject(payload.patientSummary);
  if (Object.keys(fromPatientSummary).length > 0) return fromPatientSummary;

  const basic = asObject(payload.basic);
  const summary = asObject(payload.summary);
  const vitals = Array.isArray(payload.vitals) ? payload.vitals : [];
  const inferredChangedFindings = buildChangedFindingsSummary(
    CASE_FINDING_SECTIONS_V2,
    normalizeCaseFindings(payload.findingsV2 ?? payload.findings ?? {}),
  ).payloadEntries;

  if (Object.keys(basic).length > 0 || Object.keys(summary).length > 0 || vitals.length > 0) {
    return {
      caseId: basic.caseId ?? payload.caseId,
      name: basic.nameUnknown ? "\u4e0d\u660e" : basic.name,
      age: basic.calculatedAge ?? basic.age,
      teamCode: basic.teamCode,
      teamName: basic.teamName,
      address: basic.address,
      phone: basic.phone,
      gender: basic.gender,
      adl: basic.adl,
      dnar: basic.dnar ?? basic.dnarOption,
      allergy: basic.allergy,
      weight: basic.weight,
      relatedPeople: Array.isArray(basic.relatedPeople) ? basic.relatedPeople : [],
      pastHistories: Array.isArray(basic.pastHistories) ? basic.pastHistories : [],
      specialNote: basic.specialNote,
      chiefComplaint: summary.chiefComplaint,
      dispatchSummary: summary.dispatchSummary,
      vitals,
      changedFindings: asChangedFindingEntries(payload.changedFindings) ?? inferredChangedFindings,
      updatedAt: new Date().toISOString(),
    };
  }

  const keys = [
    "caseId",
    "name",
    "age",
    "address",
    "phone",
    "gender",
    "birthSummary",
    "adl",
    "dnar",
    "allergy",
    "weight",
    "relatedPeople",
    "pastHistories",
    "specialNote",
    "chiefComplaint",
    "dispatchSummary",
    "vitals",
    "changedFindings",
    "updatedAt",
  ] as const;

  const picked: SummaryRecord = {};
  for (const key of keys) {
    if (payload[key] !== undefined) {
      picked[key] = payload[key];
    }
  }
  if (picked.changedFindings === undefined) {
    picked.changedFindings = inferredChangedFindings;
  } else {
    picked.changedFindings = asChangedFindingEntries(picked.changedFindings) ?? inferredChangedFindings;
  }
  return picked;
}
