import type { CaseFindings } from "@/lib/caseFindingsSchema";

function asStatePositive(value: unknown): boolean {
  return value === "positive";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getItem(findings: CaseFindings, sectionId: string, itemId: string) {
  return findings[sectionId]?.[itemId];
}

export function toLegacyCaseFindings(findings: CaseFindings): Record<string, unknown> {
  const commonHeadache = getItem(findings, "common", "headache");
  const commonNausea = getItem(findings, "common", "nausea");
  const commonVomit = getItem(findings, "common", "vomit");
  const commonColdSweat = getItem(findings, "common", "cold-sweat");
  const paralysis = getItem(findings, "neuro", "paralysis");
  const sensory = getItem(findings, "neuro", "sensory-disturbance");
  const chestPain = getItem(findings, "cardio", "chest-pain");
  const palpitation = getItem(findings, "cardio", "palpitation");
  const edema = getItem(findings, "cardio", "edema");
  const abdominalPain = getItem(findings, "digestive", "abdominal-pain");
  const hematemesis = getItem(findings, "digestive", "hematemesis");
  const melena = getItem(findings, "digestive", "melena");
  const abdominalDistension = getItem(findings, "digestive", "abdominal-distension");
  const trauma = getItem(findings, "musculoskeletal", "external-injury");

  return {
    neuro: {
      headachePositive: asStatePositive(commonHeadache?.state),
      headacheQuality: asString(commonHeadache?.details.quality),
      headacheAction: asString(commonHeadache?.details.onsetAction),
      headacheActionOther: "",
      headacheCourse: "",
      headacheOther: "",
      nauseaPositive: asStatePositive(commonNausea?.state),
      nauseaCourse: "",
      nauseaOther: "",
      vomitPositive: asStatePositive(commonVomit?.state),
      vomitQuality: "",
      vomitCountMode: "confirmed",
      vomitCountConfirmed: asString(commonVomit?.details.count),
      vomitCountMin: "",
      vomitCountMax: "",
      vomitOther: asString(commonVomit?.details.content),
      dizzinessPositive: false,
      dizzinessType: "",
      dizzinessAction: "",
      dizzinessActionOther: "",
      dizzinessCourse: "",
      dizzinessPast: false,
      dizzinessPastWhen: "",
      tinnitusPositive: false,
      earFullnessPositive: false,
      numbnessPositive: asStatePositive(sensory?.state),
      numbnessSite: "",
      paralysisOnsetDate: asString(paralysis?.details.onsetTime),
      paralysisOnsetTime: "",
      paralysisAction: "",
      paralysisActionOther: "",
      paralysisLastKnownDate: asString(paralysis?.details.lastKnownWell),
      paralysisLastKnownTime: "",
      paralysisSite: asString(paralysis?.details.site),
      paralysisGaze: "",
    },
    cardio: {
      chestPainPositive: asStatePositive(chestPain?.state),
      chestPainAction: asString(chestPain?.details.onsetTime),
      chestPainActionOther: "",
      chestPainLocation: Array.isArray(chestPain?.details.site) ? chestPain.details.site.join("、") : "",
      chestPainQuality: asString(chestPain?.details.quality),
      chestPainRadiation: asStatePositive(chestPain?.details.radiation),
      chestPainRadiationCourse: asString(chestPain?.details.radiationDestination),
      chestPainNrs: asString(chestPain?.details.nrs),
      coldSweatPositive: asStatePositive(commonColdSweat?.state),
      facialPallorPositive: false,
      chestPressurePositive: false,
      chestDiscomfortPositive: false,
      palpitationAction: asString(palpitation?.details.onsetAction),
      palpitationActionOther: "",
      palpitationCourse: asString(palpitation?.details.historyType),
      jvdPositive: false,
      respSound: "",
      respSoundOther: "",
      edemaPositive: asStatePositive(edema?.state),
      edemaUsual: asString(edema?.details.course) === "\u6162\u6027",
      diureticsHistory: false,
    },
    digestive: {
      abPainPositive: asStatePositive(abdominalPain?.state),
      abPainRegion: Array.isArray(abdominalPain?.details.region) ? abdominalPain.details.region.join("、") : "",
      abPainQuality: asString(abdominalPain?.details.quality),
      abTenderness: asStatePositive(abdominalPain?.details.tenderness),
      abRebound: asStatePositive(abdominalPain?.details.rebound),
      abPainCourse: "",
      backPainPositive: false,
      backPainSite: "",
      backPainQuality: "",
      cvaTenderness: false,
      dysuriaPain: false,
      hematuriaPositive: false,
      backAssociated: "",
      giNauseaPositive: asStatePositive(commonNausea?.state),
      giNauseaActionText: "",
      giNauseaHeadache: false,
      giNauseaDizziness: false,
      giNauseaNumbness: false,
      giNauseaOther: "",
      giNauseaCourse: "",
      giVomitPositive: asStatePositive(commonVomit?.state),
      giVomitCount: asString(commonVomit?.details.count),
      diarrheaPositive: false,
      diarrheaCount: "",
      hematemesisPositive: asStatePositive(hematemesis?.state),
      hematemesisAmount: asString(hematemesis?.details.amount),
      hematemesisColor: asString(hematemesis?.details.color),
      hematemesisCharacter: "",
      melenaPositive: asStatePositive(melena?.state),
      melenaAmount: asString(melena?.details.amount),
      melenaColor: asString(melena?.details.color),
      melenaCharacter: "",
      abDistension: asStatePositive(abdominalDistension?.state),
      abBulge: false,
      abBulgeRegion: "",
      boardLike: asStatePositive(abdominalPain?.details.guarding),
    },
    trauma: {
      faceHeadTrauma: asString(trauma?.details.site),
      faceHeadNormal: false,
      neckTrauma: "",
      neckNormal: false,
      trunkTrauma: "",
      trunkNormal: false,
      pelvisTrauma: "",
      pelvisNormal: false,
      upperLimbTrauma: "",
      upperLimbNormal: false,
      lowerLimbTrauma: "",
      lowerLimbNormal: false,
    },
  };
}
