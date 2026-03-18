import { CASE_FINDING_SECTIONS_V2, createEmptyCaseFindings } from "@/lib/caseFindingsConfig";
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

function cloneNewShape(raw: Record<string, unknown>): CaseFindings | null {
  const base = createEmptyCaseFindings();
  let touched = false;

  for (const section of CASE_FINDING_SECTIONS_V2) {
    const rawSection = asRecord(raw[section.id]);
    for (const itemDef of section.items) {
      const rawItem = asRecord(rawSection[itemDef.id]);
      if (Object.keys(rawItem).length === 0) continue;

      if (isFindingState(rawItem.state)) {
        base[section.id][itemDef.id].state = rawItem.state;
        touched = true;
      }

      const rawDetails = asRecord(rawItem.details);
      for (const detailDef of itemDef.details) {
        const rawValue = rawDetails[detailDef.id];
        if (detailDef.kind === "state") {
          if (isFindingState(rawValue)) {
            base[section.id][itemDef.id].details[detailDef.id] = rawValue;
            touched = true;
          }
          continue;
        }

        if (typeof rawValue === "string") {
          base[section.id][itemDef.id].details[detailDef.id] = rawValue;
          touched = true;
        }
      }
    }
  }

  return touched ? base : null;
}

function normalizeLegacy(raw: Record<string, unknown>): CaseFindings {
  const findings = createEmptyCaseFindings();
  const neuro = asRecord(raw.neuro);
  const cardio = asRecord(raw.cardio);
  const digestive = asRecord(raw.digestive);
  const trauma = asRecord(raw.trauma);

  const consciousnessTouched =
    neuro.headachePositive === true ||
    neuro.vomitPositive === true ||
    neuro.nauseaPositive === true ||
    asString(neuro.headacheQuality) !== "" ||
    asString(neuro.vomitQuality) !== "";
  setItemState(findings, "neuro", "consciousness-disturbance", consciousnessTouched ? "positive" : "unselected");
  setDetail(findings, "neuro", "consciousness-disturbance", "headache", legacyPositiveState(neuro.headachePositive));
  setDetail(findings, "neuro", "consciousness-disturbance", "vomit", legacyPositiveState(neuro.vomitPositive));
  setDetail(findings, "neuro", "consciousness-disturbance", "nausea", legacyPositiveState(neuro.nauseaPositive));

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
  setDetail(findings, "neuro", "paralysis", "headache", legacyPositiveState(neuro.headachePositive));
  setDetail(findings, "neuro", "paralysis", "vomit", legacyPositiveState(neuro.vomitPositive));
  setDetail(findings, "neuro", "paralysis", "nausea", legacyPositiveState(neuro.nauseaPositive));

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
  setDetail(findings, "cardio", "chest-pain", "coldSweat", legacyPositiveState(cardio.coldSweatPositive));

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
    setItemState(findings, "digestive", "nausea", "positive");
  }

  if (digestive.giVomitPositive === true || asString(digestive.giVomitCount) !== "") {
    setItemState(findings, "digestive", "vomit", "positive");
    setDetail(findings, "digestive", "vomit", "count", asString(digestive.giVomitCount));
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
