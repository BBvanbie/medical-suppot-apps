import type {
  CaseFindingSectionDefinition,
  CaseFindings,
  CaseFindingDetailDefinition,
  FindingDetailKind,
  FindingDetailValue,
  FindingDetailSummaryFormat,
  FindingDetailVisibility,
} from "@/lib/caseFindingsSchema";
import {
  TRAUMA_BLEEDING_OPTIONS,
  TRAUMA_REGION_OPTIONS,
  TRAUMA_ROW_ITEM_IDS,
  TRAUMA_WOUND_TYPE_OPTIONS,
} from "@/lib/traumaFindings";

const YES_NO_UNABLE_OPTIONS = ["＋", "－", "確認困難"] as const;
const PAIN_QUALITY_OPTIONS = ["圧迫感", "締め付け感", "刺すような痛み", "鈍痛", "拍動性", "その他"] as const;
const PAIN_COURSE_OPTIONS = ["改善傾向", "増悪傾向", "変わらず", "間欠的", "その他"] as const;
const RESP_PATTERN_OPTIONS = ["努力呼吸", "起坐呼吸", "頻呼吸", "徐呼吸", "その他"] as const;
const BREATH_SOUND_OPTIONS = ["正常", "喘鳴", "湿性ラ音", "乾性ラ音", "減弱", "その他"] as const;
const ABNORMAL_BREATHING_PATTERN_OPTIONS = ["なし", "Kussmaul", "Cheyne-Stokes", "Biot様", "無呼吸発作", "その他"] as const;
const DYSPNEA_SIDE_OPTIONS = ["右", "左", "両側", "その他"] as const;
const DYSPNEA_ACTION_OPTIONS = ["安静時", "労作時", "体位変換時", "臥位時", "歩行時", "その他"] as const;
const PALPITATION_HISTORY_OPTIONS = ["初回", "既往あり"] as const;
const PALPITATION_ACTION_OPTIONS = ["安静時", "運動時", "労作時", "その他"] as const;
const EDEMA_DISTRIBUTION_OPTIONS = ["下腿", "足", "全身", "顔面", "その他"] as const;
const COUGH_OPTIONS = ["乾性", "湿性", "両方"] as const;
const NASAL_DISCHARGE_OPTIONS = ["水様", "粘性", "膿性", "血性", "その他"] as const;
const SPUTUM_COLOR_OPTIONS = ["無色", "白色", "黄色", "緑色", "血性", "その他"] as const;
const SPUTUM_AMOUNT_OPTIONS = ["少量", "中等量", "多量"] as const;
const ABDOMINAL_REGION_OPTIONS = ["右季肋部", "心窩部", "左季肋部", "右側腹部", "臍部", "左側腹部", "右下腹部", "下腹部", "左下腹部", "その他"] as const;
const ABDOMINAL_PAIN_QUALITY_OPTIONS = ["疝痛", "圧迫感", "締め付け感", "刺すような痛み", "鈍痛", "灼熱感", "拍動性", "その他"] as const;
const ABDOMINAL_PAIN_COURSE_OPTIONS = ["改善傾向", "増悪傾向", "持続的", "間欠的", "変わらず", "その他"] as const;
const ABDOMINAL_RADIATION_OPTIONS = ["背部", "肩", "鼠径部", "胸部", "その他"] as const;
const DIARRHEA_QUALITY_OPTIONS = ["水様", "泥状", "軟便", "血性", "粘血性", "その他"] as const;
const VOMIT_CONTENT_OPTIONS = ["食物残渣", "胆汁性", "コーヒー残渣様", "血液", "その他"] as const;
const HEMATEMESIS_COLOR_OPTIONS = ["鮮血", "暗赤色", "コーヒー残渣", "その他"] as const;
const MELENA_COLOR_OPTIONS = ["鮮血", "暗赤色", "黒色", "その他"] as const;
const URINE_COLOR_OPTIONS = ["赤色尿", "茶褐色尿", "濃色尿"] as const;
const URINARY_VOIDING_DIFFICULTY_OPTIONS = ["尿勢低下", "尿線途絶", "排尿遅延", "腹圧排尿"] as const;
const URINARY_FOREIGN_BODY_OPTIONS = ["凝血塊", "砂状物", "結石様異物"] as const;
const URINARY_PAIN_SITE_OPTIONS = ["下腹部", "膀胱部", "側腹部", "腰背部", "CVA叩打部", "会陰部"] as const;
const URINARY_LAST_VOID_ABNORMAL_OPTIONS = ["疼痛", "血尿", "混濁", "悪臭"] as const;
const PARALYSIS_SITE_OPTIONS = ["右上肢", "左上肢", "右下肢", "左下肢", "右片麻痺", "左片麻痺", "両下肢", "その他"] as const;
const PARALYSIS_QUALITY_OPTIONS = ["脱力", "しびれ", "巧緻性低下", "その他"] as const;
const PARALYSIS_SEVERITY_OPTIONS = ["完全麻痺", "不全麻痺"] as const;
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

function hiddenStateDetail(id: string, label: string, showWhen?: FindingDetailVisibility) {
  return withCondition(
    { id, label, kind: "state" as FindingDetailKind, options: YES_NO_UNABLE_OPTIONS, summaryHidden: true },
    showWhen,
  );
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
          numberDetail("nrs", "NRS"),
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
          selectDetail("abnormalBreathingPattern", "異常呼吸パターン", ABNORMAL_BREATHING_PATTERN_OPTIONS),
          textDetail("abnormalBreathingPatternOther", "異常呼吸パターン(その他)", { detailId: "abnormalBreathingPattern", equals: "その他" }),
          selectDetail("breathSound", "呼吸音", BREATH_SOUND_OPTIONS),
          textDetail("breathSoundOther", "呼吸音(その他)", { detailId: "breathSound", equals: "その他" }),
          selectDetail("site", "部位", DYSPNEA_SIDE_OPTIONS),
          textDetail("siteOther", "部位(その他)", { detailId: "site", equals: "その他" }),
          selectDetail("action", "発症時の動作", DYSPNEA_ACTION_OPTIONS),
          textDetail("actionOther", "発症時の動作(その他)", { detailId: "action", equals: "その他" }),
        ],
      },
      { id: "cyanosis", label: "チアノーゼ", details: [] },
      {
        id: "convulsion",
        label: "痙攣",
        details: [
          selectDetail("siteType", "部位", CONVULSION_SITE_OPTIONS),
          multiselectDetail("focalSite", "局所部位", CONVULSION_FOCAL_SITE_OPTIONS, { detailId: "siteType", equals: "局所" }),
          textDetail("focalSiteOther", "局所部位(その他)", { detailId: "focalSite", equals: "その他" }),
          selectDetail("quality", "性状", CONVULSION_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          durationDetail("duration", "継続時間", undefined, "duration-minutes"),
          stateDetail("ongoing", "持続中"),
          stateDetail("postictal", "発作後状態"),
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
          timeDetail("onsetTime", "発症時間"),
          selectDetail("course", "経過", PAIN_COURSE_OPTIONS),
          textDetail("courseOther", "経過(その他)", { detailId: "course", equals: "その他" }),
        ],
      },
      {
        id: "nasal-discharge",
        label: "鼻汁",
        details: [
          selectDetail("quality", "性状", NASAL_DISCHARGE_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
        ],
      },
      {
        id: "sputum",
        label: "喀痰",
        details: [
          selectDetail("color", "色調", SPUTUM_COLOR_OPTIONS),
          textDetail("colorOther", "色調(その他)", { detailId: "color", equals: "その他" }),
          selectDetail("amount", "量", SPUTUM_AMOUNT_OPTIONS),
          stateDetail("difficulty", "喀出困難"),
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
          selectDetail("quality", "性状", ABDOMINAL_PAIN_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          timeDetail("onsetTime", "発症時間"),
          selectDetail("course", "経過", ABDOMINAL_PAIN_COURSE_OPTIONS),
          textDetail("courseOther", "経過(その他)", { detailId: "course", equals: "その他" }),
          stateDetail("radiation", "放散"),
          multiselectDetail("radiationTarget", "放散先", ABDOMINAL_RADIATION_OPTIONS, { detailId: "radiation", equals: "positive" }),
          textDetail("radiationOther", "放散(その他)", { detailId: "radiationTarget", includes: "その他" }),
          stateDetail("tenderness", "圧痛"),
          stateDetail("rebound", "反跳痛"),
          stateDetail("guarding", "筋性防御"),
          numberDetail("nrs", "NRS"),
        ],
      },
      {
        id: "diarrhea",
        label: "下痢",
        details: [
          numberDetail("count", "回数"),
          selectDetail("quality", "性状", DIARRHEA_QUALITY_OPTIONS),
          textDetail("qualityOther", "性状(その他)", { detailId: "quality", equals: "その他" }),
          timeDetail("onsetTime", "発症時間"),
        ],
      },
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
      { id: "constipation", label: "便秘", details: [timeDetail("lastBowelMovement", "最終排便時間"), stateDetail("gasStop", "排ガス停止")] },
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
          stateDetail("visualFieldDefect", "視野障害"),
        ],
      },
      {
        id: "language-disturbance",
        label: "言語障害",
        details: [
          stateDetail("slurredSpeech", "呂律障害"),
          stateDetail("dysarthria", "構音障害"),
          stateDetail("aphasia", "失語"),
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
        id: "urinary-pattern",
        label: "排尿パターン",
        details: [
          stateDetail("frequency", "頻尿"),
          stateDetail("urgency", "尿意切迫"),
          stateDetail("voidingDifficulty", "排出障害"),
          multiselectDetail("voidingDifficultyType", "排出障害種別", URINARY_VOIDING_DIFFICULTY_OPTIONS, { detailId: "voidingDifficulty", equals: "positive" }),
          stateDetail("residualUrine", "残尿感"),
          stateDetail("urinaryRetention", "尿閉"),
          stateDetail("urinaryIncontinence", "尿失禁"),
        ],
      },
      {
        id: "urine-volume",
        label: "尿量異常",
        details: [
          stateDetail("oliguria", "乏尿"),
          stateDetail("anuria", "無尿"),
          stateDetail("polyuria", "多尿"),
        ],
      },
      {
        id: "urine-character",
        label: "尿性状",
        details: [
          stateDetail("hematuria", "血尿"),
          stateDetail("cloudyUrine", "混濁尿"),
          stateDetail("pyuria", "膿尿"),
          stateDetail("foamyUrine", "泡沫尿"),
          stateDetail("malodorousUrine", "悪臭尿"),
          stateDetail("colorAbnormal", "色調異常"),
          multiselectDetail("colorAbnormalType", "色調異常種別", URINE_COLOR_OPTIONS, { detailId: "colorAbnormal", equals: "positive" }),
          stateDetail("foreignBody", "異物混入"),
          multiselectDetail("foreignBodyType", "異物混入種別", URINARY_FOREIGN_BODY_OPTIONS, { detailId: "foreignBody", equals: "positive" }),
        ],
      },
      {
        id: "urinary-pain",
        label: "疼痛",
        details: [
          stateDetail("painOnUrination", "排尿時痛"),
          stateDetail("painAfterUrination", "排尿後痛"),
          stateDetail("painWithUrge", "尿意時痛"),
          stateDetail("painSite", "疼痛部位"),
          multiselectDetail("painSiteType", "疼痛部位種別", URINARY_PAIN_SITE_OPTIONS, { detailId: "painSite", equals: "positive" }),
        ],
      },
      {
        id: "last-urination",
        label: "最終排尿",
        details: [
          timeDetail("lastUrinationTime", "最終排尿時刻"),
          textDetail("lastUrinationAmount", "最終排尿量"),
          stateDetail("lastUrinationAbnormal", "最終排尿時異常"),
          multiselectDetail("lastUrinationAbnormalType", "最終排尿時異常種別", URINARY_LAST_VOID_ABNORMAL_OPTIONS, { detailId: "lastUrinationAbnormal", equals: "positive" }),
        ],
      },
    ],
  },
  {
    id: "musculoskeletal",
    label: "外傷",
    items: TRAUMA_ROW_ITEM_IDS.map((itemId, index) => ({
      id: itemId,
      label: `外傷${index + 1}`,
      details: [
        selectDetail("region", "大部位", TRAUMA_REGION_OPTIONS),
        selectDetail("site", "部位", ["その他"] as const),
        textDetail("siteOther", "部位(その他)", { detailId: "site", equals: "その他" }),
        textDetail("size", "サイズ"),
        selectDetail("bleeding", "出血", TRAUMA_BLEEDING_OPTIONS),
        selectDetail("woundType", "創傷種別", TRAUMA_WOUND_TYPE_OPTIONS),
        stateDetail("deformity", "変形有無"),
        stateDetail("sutureRequired", "縫合要否"),
        hiddenStateDetail("photoTaken", "撮影"),
        hiddenStateDetail("confirmed", "確認"),
      ],
    })),
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
