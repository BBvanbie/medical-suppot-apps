import { createEmptyCaseFindings } from "@/lib/caseFindingsConfig";
import type { CaseFindings, FindingDetailValue, FindingState } from "@/lib/caseFindingsSchema";
import { isFindingState } from "@/lib/caseFindingsSchema";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function legacyPositiveState(value: unknown): FindingState {
  return value === true ? "positive" : "unselected";
}

function setItemState(findings: CaseFindings, sectionId: string, itemId: string, nextState: FindingState) {
  const item = findings[sectionId]?.[itemId];
  if (!item) return;
  item.state = nextState;
}

function setDetail(findings: CaseFindings, sectionId: string, itemId: string, detailId: string, value: FindingDetailValue) {
  const item = findings[sectionId]?.[itemId];
  if (!item || !(detailId in item.details)) return;
  item.details[detailId] = value;
}

function promoteRemovedCommonFields(raw: Record<string, unknown>, findings: CaseFindings) {
  const promoteItem = (sourceSectionId: string, sourceItemId: string, targetItemId: string) => {
    const source = asRecord(asRecord(raw[sourceSectionId])[sourceItemId]);
    const target = findings.common?.[targetItemId];
    const state = source.state;
    if (!target || !isFindingState(state) || state === "unselected" || target.state !== "unselected") return;
    target.state = state;

    const rawDetails = asRecord(source.details);
    for (const key of Object.keys(target.details)) {
      const rawValue = rawDetails[key];
      if (isFindingState(rawValue) || typeof rawValue === "string") {
        target.details[key] = rawValue;
      }
    }
  };

  const promoteDetailState = (sourceSectionId: string, sourceItemId: string, detailId: string, targetItemId: string) => {
    const source = asRecord(asRecord(asRecord(raw[sourceSectionId])[sourceItemId]).details);
    const target = findings.common?.[targetItemId];
    const state = source[detailId];
    if (!target || !isFindingState(state) || state === "unselected" || target.state !== "unselected") return;
    target.state = state;
  };

  const promoteDetailText = (sourceSectionId: string, sourceItemId: string, detailId: string, targetItemId: string, targetDetailId: string) => {
    const source = asRecord(asRecord(asRecord(raw[sourceSectionId])[sourceItemId]).details);
    const target = findings.common?.[targetItemId];
    const text = asString(source[detailId]);
    if (!target || text === "") return;
    if (target.state === "unselected") {
      target.state = "positive";
    }
    if (targetDetailId in target.details && asString(target.details[targetDetailId]) === "") {
      target.details[targetDetailId] = text;
    }
  };

  promoteItem("cardio", "dyspnea", "dyspnea");
  promoteDetailState("cardio", "palpitation", "dyspnea", "dyspnea");
  promoteItem("digestive", "nausea", "nausea");
  promoteItem("digestive", "vomit", "vomit");
  promoteDetailState("neuro", "consciousness-disturbance", "headache", "headache");
  promoteDetailState("neuro", "consciousness-disturbance", "nausea", "nausea");
  promoteDetailState("neuro", "consciousness-disturbance", "vomit", "vomit");
  promoteDetailState("neuro", "paralysis", "headache", "headache");
  promoteDetailState("neuro", "paralysis", "nausea", "nausea");
  promoteDetailState("neuro", "paralysis", "vomit", "vomit");
  promoteDetailState("cardio", "dyspnea", "cyanosis", "cyanosis");
  promoteDetailState("cardio", "dyspnea", "sweat", "sweat");
  promoteDetailState("cardio", "chest-pain", "coldSweat", "cold-sweat");
  promoteDetailState("cardio", "syncope", "convulsion", "convulsion");
  promoteDetailState("neuro", "paralysis", "convulsion", "convulsion");
  promoteDetailText("cardio", "syncope", "convulsionType", "convulsion", "type");
}

function cloneNewShape(raw: Record<string, unknown>): CaseFindings | null {
  const base = createEmptyCaseFindings();
  let touched = false;

  for (const [sectionId, sectionValue] of Object.entries(raw)) {
    const rawSection = asRecord(sectionValue);
    const targetSection = base[sectionId];
    if (!targetSection) continue;

    for (const [itemId, itemValue] of Object.entries(rawSection)) {
      const targetItem = targetSection[itemId];
      const rawItem = asRecord(itemValue);
      if (!targetItem || Object.keys(rawItem).length === 0) continue;

      if (isFindingState(rawItem.state)) {
        targetItem.state = rawItem.state;
        touched = true;
      }

      const rawDetails = asRecord(rawItem.details);
      for (const [detailId, rawValue] of Object.entries(rawDetails)) {
        if (!(detailId in targetItem.details)) continue;
        if (isFindingState(rawValue) || typeof rawValue === "string") {
          targetItem.details[detailId] = rawValue;
          touched = true;
        }
      }
    }
  }

  if (touched) promoteRemovedCommonFields(raw, base);
  return touched ? base : null;
}

function normalizeLegacy(raw: Record<string, unknown>): CaseFindings {
  const findings = createEmptyCaseFindings();
  const neuro = asRecord(raw.neuro);
  const cardio = asRecord(raw.cardio);
  const digestive = asRecord(raw.digestive);
  const trauma = asRecord(raw.trauma);

  const commonHeadacheTouched = neuro.headachePositive === true || asString(neuro.headacheQuality) !== "";
  setItemState(findings, "common", "headache", commonHeadacheTouched ? "positive" : "unselected");
  setDetail(findings, "common", "headache", "quality", asString(neuro.headacheQuality));
  setDetail(findings, "common", "headache", "onsetAction", asString(neuro.headacheAction));

  if (neuro.nauseaPositive === true) {
    setItemState(findings, "common", "nausea", "positive");
  }

  if (neuro.vomitPositive === true || asString(neuro.vomitQuality) !== "") {
    setItemState(findings, "common", "vomit", "positive");
    setDetail(findings, "common", "vomit", "content", asString(neuro.vomitQuality));
  }

  if (cardio.coldSweatPositive === true) {
    setItemState(findings, "common", "cold-sweat", "positive");
  }

  setItemState(findings, "neuro", "consciousness-disturbance", "unselected");

  const paralysisTouched =
    asString(neuro.paralysisSite) !== "" ||
    asString(neuro.paralysisOnsetDate) !== "" ||
    asString(neuro.paralysisOnsetTime) !== "" ||
    asString(neuro.paralysisLastKnownDate) !== "" ||
    asString(neuro.paralysisLastKnownTime) !== "";
  setItemState(findings, "neuro", "paralysis", paralysisTouched ? "positive" : "unselected");
  setDetail(findings, "neuro", "paralysis", "site", asString(neuro.paralysisSite));
  setDetail(findings, "neuro", "paralysis", "quality", asString(neuro.paralysisGaze));
  setDetail(findings, "neuro", "paralysis", "onsetTime", [asString(neuro.paralysisOnsetDate), asString(neuro.paralysisOnsetTime)].filter(Boolean).join(" "));
  setDetail(findings, "neuro", "paralysis", "lastKnownWell", [asString(neuro.paralysisLastKnownDate), asString(neuro.paralysisLastKnownTime)].filter(Boolean).join(" "));

  if (neuro.numbnessPositive === true || asString(neuro.numbnessSite) !== "") {
    setItemState(findings, "neuro", "sensory-disturbance", "positive");
  }

  const chestPainTouched =
    cardio.chestPainPositive === true ||
    asString(cardio.chestPainQuality) !== "" ||
    asString(cardio.chestPainLocation) !== "" ||
    asString(cardio.chestPainNrs) !== "";
  setItemState(findings, "cardio", "chest-pain", chestPainTouched ? "positive" : "unselected");
  setDetail(findings, "cardio", "chest-pain", "quality", asString(cardio.chestPainQuality));
  setDetail(findings, "cardio", "chest-pain", "nrs", asString(cardio.chestPainNrs));
  setDetail(findings, "cardio", "chest-pain", "radiation", legacyPositiveState(cardio.chestPainRadiation));
  setDetail(findings, "cardio", "chest-pain", "onsetAction", asString(cardio.chestPainAction));

  if (asString(cardio.palpitationAction) !== "" || asString(cardio.palpitationCourse) !== "") {
    setItemState(findings, "cardio", "palpitation", "positive");
    setDetail(findings, "cardio", "palpitation", "diagnosis", asString(cardio.palpitationAction));
  }

  if (cardio.edemaPositive === true || cardio.edemaUsual === true) {
    setItemState(findings, "cardio", "edema", "positive");
    setDetail(findings, "cardio", "edema", "course", cardio.edemaUsual === true ? "chronic" : "acute");
  }

  const abdominalPainTouched =
    digestive.abPainPositive === true ||
    asString(digestive.abPainRegion) !== "" ||
    asString(digestive.abPainQuality) !== "";
  setItemState(findings, "digestive", "abdominal-pain", abdominalPainTouched ? "positive" : "unselected");
  setDetail(findings, "digestive", "abdominal-pain", "region", asString(digestive.abPainRegion));
  setDetail(findings, "digestive", "abdominal-pain", "tenderness", legacyPositiveState(digestive.abTenderness));
  setDetail(findings, "digestive", "abdominal-pain", "rebound", legacyPositiveState(digestive.abRebound));
  setDetail(findings, "digestive", "abdominal-pain", "guarding", legacyPositiveState(digestive.boardLike));

  if (digestive.giNauseaPositive === true) {
    setItemState(findings, "common", "nausea", "positive");
  }

  if (digestive.giVomitPositive === true || asString(digestive.giVomitCount) !== "") {
    setItemState(findings, "common", "vomit", "positive");
    setDetail(findings, "common", "vomit", "count", asString(digestive.giVomitCount));
  }

  if (digestive.hematemesisPositive === true || digestive.melenaPositive === true) {
    setItemState(findings, "digestive", "hematemesis-melena", "positive");
    setDetail(findings, "digestive", "hematemesis-melena", "count", asString(digestive.hematemesisAmount) || asString(digestive.melenaAmount));
    setDetail(findings, "digestive", "hematemesis-melena", "color", asString(digestive.hematemesisColor) || asString(digestive.melenaColor));
    setDetail(findings, "digestive", "hematemesis-melena", "amount", asString(digestive.hematemesisAmount) || asString(digestive.melenaAmount));
  }

  if (digestive.abDistension === true || digestive.abBulge === true) {
    setItemState(findings, "digestive", "abdominal-distension", "positive");
  }

  const legacyTraumaNotes = [
    ["head-neck", asString(trauma.faceHeadTrauma), trauma.faceHeadNormal],
    ["neck", asString(trauma.neckTrauma), trauma.neckNormal],
    ["trunk", asString(trauma.trunkTrauma), trauma.trunkNormal],
    ["pelvis", asString(trauma.pelvisTrauma), trauma.pelvisNormal],
    ["upper-limb", asString(trauma.upperLimbTrauma), trauma.upperLimbNormal],
    ["lower-limb", asString(trauma.lowerLimbTrauma), trauma.lowerLimbNormal],
  ]
    .filter((entry) => entry[1] !== "" && entry[2] !== true)
    .map((entry) => `${entry[0]}:${entry[1]}`)
    .join(" / ");

  if (legacyTraumaNotes !== "") {
    setItemState(findings, "musculoskeletal", "external-injury", "positive");
    setDetail(findings, "musculoskeletal", "external-injury", "site", legacyTraumaNotes);
  }

  return findings;
}

export function normalizeCaseFindings(raw: unknown): CaseFindings {
  const input = asRecord(raw);
  const nextShape = cloneNewShape(input);
  if (nextShape) return nextShape;
  return normalizeLegacy(input);
}
