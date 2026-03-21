import type {
  CaseFindingSectionDefinition,
  CaseFindings,
  CaseFindingDetailDefinition,
  FindingDetailKind,
  FindingDetailValue,
  FindingDetailSummaryFormat,
  FindingDetailVisibility,
} from "@/lib/caseFindingsSchema";

const YES_NO_UNABLE_OPTIONS = ["＋", "－", "確認困難"] as const;
const PAIN_QUALITY_OPTIONS = ["圧迫感", "締め付け感", "刺すような痛み", "鈍痛", "拍動性", "その他"] as const;
const PAIN_COURSE_OPTIONS = ["改善傾向", "増悪傾向", "変わらず", "間欠的", "その他"] as const;
const RESP_PATTERN_OPTIONS = ["努力呼吸", "起坐呼吸", "頻呼吸", "徐呼吸", "喘鳴", "その他"] as const;
const BREATH_SOUND_OPTIONS = ["正常", "喘鳴", "湿性ラ音", "乾性ラ音", "減弱", "その他"] as const;
const PALPITATION_HISTORY_OPTIONS = ["初回", "既往あり"] as const;
const PALPITATION_ACTION_OPTIONS = ["安静時", "運動時", "労作時", "その他"] as const;
const EDEMA_DISTRIBUTION_OPTIONS = ["下腿", "足", "全身", "顔面", "その他"] as const;
const COUGH_OPTIONS = ["乾性", "湿性", "両方", "その他"] as const;
const SPUTUM_OPTIONS = ["無色", "白色", "黄色", "緑色", "血性", "その他"] as const;
const ABDOMINAL_REGION_OPTIONS = ["右季肋部", "心窩部", "左季肋部", "右側腹部", "臍部", "左側腹部", "右下腹部", "下腹部", "左下腹部", "その他"] as const;
const VOMIT_CONTENT_OPTIONS = ["食残", "胃内容", "コーヒー残渣様", "血液", "その他"] as const;
const HEMATEMESIS_COLOR_OPTIONS = ["鮮血", "暗赤色", "コーヒー残渣", "その他"] as const;
const MELENA_COLOR_OPTIONS = ["鮮血", "暗赤色", "黒色", "その他"] as const;
const PARALYSIS_SITE_OPTIONS = ["右上肢", "左上肢", "右下肢", "左下肢", "右片麻痺", "左片麻痺", "両下肢", "その他"] as const;
const PARALYSIS_QUALITY_OPTIONS = ["脱力", "しびれ", "巧緻性低下", "その他"] as const;
const PARALYSIS_SEVERITY_OPTIONS = ["完全麻痺", "不全麻痺"] as const;
const MUSCULOSKELETAL_SITE_OPTIONS = ["頭頚部", "胸部", "腹部", "骨盤", "上肢", "下肢", "背部", "その他"] as const;
const CHEST_PAIN_SITE_OPTIONS = ["前胸部", "左胸部", "右胸部", "胸骨後部", "心窩部", "背部", "その他"] as const;
const BACK_PAIN_SITE_OPTIONS = ["頚部", "肩甲間部", "背部中央", "腰背部", "側腹部", "その他"] as const;
const CONVULSION_SITE_OPTIONS = ["全身", "局所"] as const;
const CONVULSION_FOCAL_SITE_OPTIONS = ["右上肢", "左上肢", "右下肢", "左下肢", "顔面", "上半身", "下半身", "その他"] as const;
const CONVULSION_QUALITY_OPTIONS = ["強直性", "間代性", "その他"] as const;
const CONSCIOUSNESS_BASELINE_OPTIONS = ["清明", "JCS 1桁", "JCS 2桁", "JCS 3桁", "その他"] as const;
const FACIAL_PARALYSIS_SITE_OPTIONS = ["右眼瞼", "左眼瞼", "右口角", "左口角", "その他"] as const;

function withCondition(detail: CaseFindingDetailDefinition, showWhen?: FindingDetailVisibility) {
  return showWhen ? { ...detail, showWhen } : detail;
}

function stateDetail(id: string, label: string, showWhen?: FindingDetailVisibility) {
  return withCondition({ id, label, kind: "state" as FindingDetailKind, options: YES_NO_UNABLE_OPTIONS }, showWhen);
}

function selectDetail(id: string, label: string, options: readonly string[], showWhen?: FindingDetailVisibility) {
  return withCondition({ id, label, kind: "select" as FindingDetailKind, options }, showWhen);
}

function textDetail(id: string, label: string, showWhen?: FindingDetailVisibility) {
  return withCondition({ id, label, kind: "text" as FindingDetailKind }, showWhen);
}

function numberDetail(id: string, label: string, showWhen?: FindingDetailVisibility) {
  return withCondition({ id, label, kind: "number" as FindingDetailKind }, showWhen);
}

function timeDetail(id: string, label: string, showWhen?: FindingDetailVisibility) {
  return withCondition({ id, label, kind: "time" as FindingDetailKind }, showWhen);
}

function multiselectDetail(id: string, label: string, options: readonly string[], showWhen?: FindingDetailVisibility) {
  return withCondition({ id, label, kind: "multiselect" as FindingDetailKind, options }, showWhen);
}

function durationDetail(id: string, label: string, showWhen?: FindingDetailVisibility, summaryFormat?: FindingDetailSummaryFormat) {
  return withCondition({ id, label, kind: "duration" as FindingDetailKind, summaryFormat }, showWhen);
}

export const CASE_FINDING_SECTIONS_V2: readonly CaseFindingSectionDefinition[] = [
  {
    id: "common",
    label: "基本所見",
    items: [
      {
        id: "headache",
        label: "頭痛",
        details: [
          selectDetail("quality", "性状", PAIN_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          timeDetail("onsetTime", "発症時間"),
          selectDetail("course", "経過", PAIN_COURSE_OPTIONS),
          textDetail("courseOther", "経過(その他)", { detailId: "course", equals: "その他" }),
        ],
      },
      { id: "nausea", label: "嘔気", details: [] },
      {
        id: "vomit",
        label: "嘔吐",
        details: [
          numberDetail("count", "回数"),
          selectDetail("content", "性状", VOMIT_CONTENT_OPTIONS),
          textDetail("contentOther", "性状(その他)", { detailId: "content", equals: "その他" }),
        ],
      },
      {
        id: "dyspnea",
        label: "呼吸困難",
        details: [
          selectDetail("respPattern", "呼吸形態", RESP_PATTERN_OPTIONS),
          textDetail("respPatternOther", "呼吸形態(その他)", { detailId: "respPattern", equals: "その他" }),
          textDetail("abnormalBreathing", "異常呼吸"),
          selectDetail("breathSound", "呼吸音", BREATH_SOUND_OPTIONS),
          textDetail("breathSoundOther", "呼吸音(その他)", { detailId: "breathSound", equals: "その他" }),
          textDetail("site", "部位"),
          textDetail("action", "発症時の動作"),
        ],
      },
      { id: "cyanosis", label: "チアノーゼ", details: [] },
      {
        id: "convulsion",
        label: "痙攣",
        details: [
          selectDetail("siteType", "部位", CONVULSION_SITE_OPTIONS),
          selectDetail("focalSite", "局所部位", CONVULSION_FOCAL_SITE_OPTIONS, { detailId: "siteType", equals: "局所" }),
          textDetail("focalSiteOther", "局所部位(その他)", { detailId: "focalSite", equals: "その他" }),
          selectDetail("quality", "性状", CONVULSION_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          durationDetail("duration", "継続時間", undefined, "duration-minutes"),
        ],
      },
      { id: "sweat", label: "発汗", details: [] },
      { id: "cold-sweat", label: "冷汗", details: [] },
    ],
  },
  {
    id: "cardio",
    label: "循環器",
    items: [
      {
        id: "chest-pain",
        label: "胸痛",
        details: [
          multiselectDetail("site", "部位", CHEST_PAIN_SITE_OPTIONS),
          textDetail("siteOther", "部位(その他)", { detailId: "site", includes: "その他" }),
          selectDetail("quality", "性状", PAIN_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          timeDetail("onsetTime", "発症時間"),
          selectDetail("course", "経過", PAIN_COURSE_OPTIONS),
          textDetail("courseOther", "経過(その他)", { detailId: "course", equals: "その他" }),
          numberDetail("nrs", "NRS"),
          stateDetail("radiation", "放散痛"),
          textDetail("radiationDestination", "放散先"),
        ],
      },
      {
        id: "back-pain",
        label: "背部痛",
        details: [
          multiselectDetail("site", "部位", BACK_PAIN_SITE_OPTIONS),
          textDetail("siteOther", "部位(その他)", { detailId: "site", includes: "その他" }),
          selectDetail("quality", "性状", PAIN_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          timeDetail("onsetTime", "発症時間"),
          selectDetail("course", "経過", PAIN_COURSE_OPTIONS),
          textDetail("courseOther", "経過(その他)", { detailId: "course", equals: "その他" }),
          numberDetail("nrs", "NRS"),
          stateDetail("movingPain", "移動痛"),
          textDetail("movingPainDestination", "移動先"),
        ],
      },
      {
        id: "palpitation",
        label: "動悸",
        details: [
          selectDetail("onsetAction", "発症時行動", PALPITATION_ACTION_OPTIONS),
          textDetail("onsetActionOther", "発症時行動(その他)", { detailId: "onsetAction", equals: "その他" }),
          selectDetail("historyType", "初回か既往か", PALPITATION_HISTORY_OPTIONS),
          numberDetail("count", "頻度"),
          stateDetail("visitHistory", "受診歴"),
          textDetail("diagnosis", "診断名"),
        ],
      },
      {
        id: "edema",
        label: "浮腫",
        details: [
          selectDetail("distribution", "部位", EDEMA_DISTRIBUTION_OPTIONS),
          textDetail("distributionOther", "部位(その他)", { detailId: "distribution", equals: "その他" }),
          selectDetail("course", "経過", ["慢性", "急性"] as const),
        ],
      },
      {
        id: "syncope",
        label: "失神",
        details: [
          stateDetail("ongoing", "継続の有無"),
          textDetail("duration", "持続時間"),
        ],
      },
    ],
  },
  {
    id: "respiratory",
    label: "呼吸器",
    items: [
      {
        id: "cough",
        label: "咳嗽",
        details: [
          selectDetail("type", "種類", COUGH_OPTIONS),
          textDetail("typeOther", "種類(その他)", { detailId: "type", equals: "その他" }),
        ],
      },
      { id: "nasal-discharge", label: "鼻汁", details: [textDetail("quality", "性状")] },
      {
        id: "sputum",
        label: "喀痰",
        details: [
          selectDetail("quality", "性状", SPUTUM_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
        ],
      },
    ],
  },
  {
    id: "digestive",
    label: "消化器",
    items: [
      {
        id: "abdominal-pain",
        label: "腹痛",
        details: [
          multiselectDetail("region", "部位", ABDOMINAL_REGION_OPTIONS),
          textDetail("regionOther", "部位(その他)", { detailId: "region", includes: "その他" }),
          selectDetail("quality", "性状", PAIN_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          timeDetail("onsetTime", "発症時間"),
          selectDetail("course", "経過", PAIN_COURSE_OPTIONS),
          textDetail("courseOther", "経過(その他)", { detailId: "course", equals: "その他" }),
          stateDetail("tenderness", "圧痛"),
          stateDetail("rebound", "反跳痛"),
          stateDetail("guarding", "筋性防御"),
          numberDetail("nrs", "NRS"),
        ],
      },
      { id: "diarrhea", label: "下痢", details: [numberDetail("count", "回数")] },
      {
        id: "hematemesis",
        label: "吐血",
        details: [
          numberDetail("count", "回数"),
          selectDetail("color", "色調", HEMATEMESIS_COLOR_OPTIONS),
          textDetail("colorOther", "色調(その他)", { detailId: "color", equals: "その他" }),
          textDetail("amount", "量"),
        ],
      },
      {
        id: "melena",
        label: "下血",
        details: [
          numberDetail("count", "回数"),
          selectDetail("color", "色調", MELENA_COLOR_OPTIONS),
          textDetail("colorOther", "色調(その他)", { detailId: "color", equals: "その他" }),
          textDetail("amount", "量"),
        ],
      },
      { id: "constipation", label: "便秘", details: [timeDetail("lastBowelMovement", "最終排便時間")] },
      { id: "jaundice", label: "黄疸", details: [] },
      { id: "abdominal-distension", label: "腹部膨満", details: [] },
    ],
  },
  {
    id: "neuro",
    label: "神経",
    items: [
      {
        id: "consciousness-disturbance",
        label: "意識障害",
        details: [
          timeDetail("duration", "継続時間"),
          selectDetail("baselineLevel", "普段のレベル", CONSCIOUSNESS_BASELINE_OPTIONS),
          textDetail("baselineLevelOther", "普段のレベル(その他)", { detailId: "baselineLevel", equals: "その他" }),
        ],
      },
      {
        id: "paralysis",
        label: "麻痺",
        details: [
          selectDetail("site", "部位", PARALYSIS_SITE_OPTIONS),
          textDetail("siteOther", "部位(その他)", { detailId: "site", equals: "その他" }),
          selectDetail("quality", "性状", PARALYSIS_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          selectDetail("severity", "麻痺の程度", PARALYSIS_SEVERITY_OPTIONS),
          timeDetail("onsetTime", "発症時間"),
          timeDetail("lastKnownWell", "最終健常確認時間"),
          stateDetail("facialParalysis", "顔面麻痺"),
          multiselectDetail("facialParalysisSite", "顔面麻痺部位", FACIAL_PARALYSIS_SITE_OPTIONS, { detailId: "facialParalysis", equals: "positive" }),
          textDetail("facialParalysisSiteOther", "顔面麻痺部位(その他)", { detailId: "facialParalysisSite", includes: "その他" }),
          stateDetail("languageDisturbance", "言語障害"),
          stateDetail("visualFieldDefect", "視野障害"),
        ],
      },
      { id: "sensory-disturbance", label: "感覚障害", details: [] },
    ],
  },
  {
    id: "urinary",
    label: "泌尿器",
    items: [
      {
        id: "dysuria",
        label: "排尿障害",
        details: [stateDetail("oliguria", "乏尿"), stateDetail("frequency", "頻尿")],
      },
      {
        id: "urinary-pain",
        label: "疼痛",
        details: [
          stateDetail("painOnUrination", "排尿時痛"),
          stateDetail("lowerBackPain", "腰痛"),
          stateDetail("flankPain", "側腹部痛"),
        ],
      },
    ],
  },
  {
    id: "musculoskeletal",
    label: "運動器",
    items: [
      {
        id: "external-injury",
        label: "外傷",
        details: [
          selectDetail("site", "部位", MUSCULOSKELETAL_SITE_OPTIONS),
          textDetail("siteOther", "部位(その他)", { detailId: "site", equals: "その他" }),
          stateDetail("bleeding", "出血"),
          stateDetail("deformity", "変形"),
          stateDetail("swelling", "腫脹"),
          stateDetail("tenderness", "圧痛"),
          stateDetail("rangeOfMotionLimit", "可動域制限"),
        ],
      },
    ],
  },
] as const;

function getEmptyDetailValue(detail: CaseFindingDetailDefinition): FindingDetailValue {
  if (detail.kind === "state") return "unselected";
  if (detail.kind === "multiselect") return [];
  return "";
}

export function createEmptyCaseFindings(): CaseFindings {
  return Object.fromEntries(
    CASE_FINDING_SECTIONS_V2.map((section) => [
      section.id,
      Object.fromEntries(
        section.items.map((item) => [
          item.id,
          {
            state: "unselected",
            details: Object.fromEntries(item.details.map((detail) => [detail.id, getEmptyDetailValue(detail)] as [string, FindingDetailValue])),
          },
        ]),
      ),
    ]),
  ) as CaseFindings;
}
