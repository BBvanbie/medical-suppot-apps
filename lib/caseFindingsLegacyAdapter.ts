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
  const consciousness = getItem(findings, "neuro", "consciousness-disturbance");
  const paralysis = getItem(findings, "neuro", "paralysis");
  const sensory = getItem(findings, "neuro", "sensory-disturbance");
  const chestPain = getItem(findings, "cardio", "chest-pain");
  const palpitation = getItem(findings, "cardio", "palpitation");
  const edema = getItem(findings, "cardio", "edema");
  const abdominalPain = getItem(findings, "digestive", "abdominal-pain");
  const nausea = getItem(findings, "digestive", "nausea");
  const vomit = getItem(findings, "digestive", "vomit");
  const bleeding = getItem(findings, "digestive", "hematemesis-melena");
  const abdominalDistension = getItem(findings, "digestive", "abdominal-distension");
  const trauma = getItem(findings, "musculoskeletal", "external-injury");

  return {
    neuro: {
      headachePositive: asStatePositive(consciousness?.details.headache) || asStatePositive(paralysis?.details.headache),
      headacheQuality: "",
      headacheAction: "",
      headacheActionOther: "",
      headacheCourse: "",
      headacheOther: "",
      nauseaPositive: asStatePositive(consciousness?.details.nausea),
      nauseaCourse: "",
      nauseaOther: "",
      vomitPositive: asStatePositive(consciousness?.details.vomit) || asStatePositive(paralysis?.details.vomit),
      vomitQuality: "",
      vomitCountMode: "confirmed",
      vomitCountConfirmed: asString(vomit?.details.count),
      vomitCountMin: "",
      vomitCountMax: "",
      vomitOther: asString(vomit?.details.content),
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
      paralysisGaze: asString(paralysis?.details.quality),
    },
    cardio: {
      chestPainPositive: asStatePositive(chestPain?.state),
      chestPainAction: asString(chestPain?.details.onsetAction),
      chestPainActionOther: "",
      chestPainLocation: "",
      chestPainQuality: asString(chestPain?.details.quality),
      chestPainRadiation: asStatePositive(chestPain?.details.radiation),
      chestPainRadiationCourse: "",
      chestPainNrs: asString(chestPain?.details.nrs),
      coldSweatPositive: asStatePositive(chestPain?.details.coldSweat),
      facialPallorPositive: false,
      chestPressurePositive: false,
      chestDiscomfortPositive: false,
      palpitationAction: asString(palpitation?.details.diagnosis),
      palpitationActionOther: "",
      palpitationCourse: "",
      jvdPositive: false,
      respSound: "??",
      respSoundOther: "",
      edemaPositive: asStatePositive(edema?.state),
      edemaUsual: asString(edema?.details.course) === "chronic",
      diureticsHistory: false,
    },
    digestive: {
      abPainPositive: asStatePositive(abdominalPain?.state),
      abPainRegion: asString(abdominalPain?.details.region),
      abPainQuality: "",
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
      giNauseaPositive: asStatePositive(nausea?.state),
      giNauseaActionText: "",
      giNauseaHeadache: false,
      giNauseaDizziness: false,
      giNauseaNumbness: false,
      giNauseaOther: "",
      giNauseaCourse: "",
      giVomitPositive: asStatePositive(vomit?.state),
      giVomitCount: asString(vomit?.details.count),
      diarrheaPositive: false,
      diarrheaCount: "",
      hematemesisPositive: asStatePositive(bleeding?.state),
      hematemesisAmount: asString(bleeding?.details.amount),
      hematemesisColor: asString(bleeding?.details.color),
      hematemesisCharacter: "",
      melenaPositive: asStatePositive(bleeding?.state),
      melenaAmount: asString(bleeding?.details.amount),
      melenaColor: asString(bleeding?.details.color),
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
