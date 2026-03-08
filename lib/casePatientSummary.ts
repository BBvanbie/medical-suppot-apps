type SummaryRecord = Record<string, unknown>;

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
  const findings = asObject(payload.findings);
  const vitals = Array.isArray(payload.vitals) ? payload.vitals : [];

  if (Object.keys(basic).length > 0 || Object.keys(summary).length > 0 || vitals.length > 0) {
    return {
      caseId: basic.caseId ?? payload.caseId,
      name: basic.nameUnknown ? "不明" : basic.name,
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
      changedFindings: Array.isArray(payload.changedFindings)
        ? payload.changedFindings
        : Array.isArray(findings.changedFindings)
          ? findings.changedFindings
          : [],
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
  return picked;
}
