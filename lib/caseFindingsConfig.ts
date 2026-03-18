import type { CaseFindingSectionDefinition, CaseFindings, FindingDetailKind, FindingDetailValue } from "@/lib/caseFindingsSchema";

const YES_NO_UNABLE_OPTIONS = ["\uff0b", "\uff0d", "\u78ba\u8a8d\u56f0\u96e3"] as const;
const PAIN_QUALITY_OPTIONS = ["\u5727\u8feb\u611f", "\u7dca\u7e2e\u611f", "\u523a\u3059\u3088\u3046\u306a\u75db\u307f", "\u920d\u75db", "\u62cd\u52d5\u6027", "\u305d\u306e\u4ed6"] as const;
const RESP_PATTERN_OPTIONS = ["\u52aa\u529b\u547c\u5438", "\u8d77\u5ea7\u547c\u5438", "\u983b\u547c\u5438", "\u5f90\u547c\u5438", "\u5598\u9cf4", "\u305d\u306e\u4ed6"] as const;
const BREATH_SOUND_OPTIONS = ["\u6b63\u5e38", "\u5598\u9cf4", "\u6e7f\u6027\u30e9\u97f3", "\u4e7e\u6027\u30e9\u97f3", "\u6e1b\u5f31", "\u305d\u306e\u4ed6"] as const;
const PALPITATION_HISTORY_OPTIONS = ["\u521d\u56de", "\u65e2\u5f80\u3042\u308a"] as const;
const EDEMA_DISTRIBUTION_OPTIONS = ["\u4e0b\u817f", "\u8db3", "\u5168\u8eab", "\u9854\u9762", "\u305d\u306e\u4ed6"] as const;
const COUGH_OPTIONS = ["\u4e7e\u6027", "\u6e7f\u6027", "\u4e21\u65b9"] as const;
const SPUTUM_OPTIONS = ["\u7121\u8272", "\u767d\u8272", "\u9ec4\u8272", "\u7dd1\u8272", "\u8840\u6027", "\u305d\u306e\u4ed6"] as const;
const ABDOMINAL_REGION_OPTIONS = ["\u53f3\u5b63\u808b\u90e8", "\u5fc3\u7aa9\u90e8", "\u5de6\u5b63\u808b\u90e8", "\u53f3\u5074\u8179\u90e8", "\u81cd\u90e8", "\u5de6\u5074\u8179\u90e8", "\u53f3\u4e0b\u8179\u90e8", "\u4e0b\u8179\u90e8", "\u5de6\u4e0b\u8179\u90e8", "\u305d\u306e\u4ed6"] as const;
const VOMIT_CONTENT_OPTIONS = ["\u98df\u6b8b", "\u80c3\u5185\u5bb9", "\u30b3\u30fc\u30d2\u30fc\u6b8b\u6e23\u69d8", "\u8840\u6db2", "\u305d\u306e\u4ed6"] as const;
const STOOL_COLOR_OPTIONS = ["\u9bae\u8840", "\u6697\u8d64\u8272", "\u9ed2\u8272", "\u305d\u306e\u4ed6"] as const;
const PARALYSIS_SITE_OPTIONS = ["\u53f3\u4e0a\u80a2", "\u5de6\u4e0a\u80a2", "\u53f3\u4e0b\u80a2", "\u5de6\u4e0b\u80a2", "\u53f3\u7247\u9ebb\u75fa", "\u5de6\u7247\u9ebb\u75fa", "\u4e21\u4e0b\u80a2", "\u305d\u306e\u4ed6"] as const;
const PARALYSIS_QUALITY_OPTIONS = ["\u8131\u529b", "\u3057\u3073\u308c", "\u5de7\u7dfb\u6027\u4f4e\u4e0b", "\u305d\u306e\u4ed6"] as const;
const MUSCULOSKELETAL_SITE_OPTIONS = ["\u982d\u981a\u90e8", "\u80f8\u90e8", "\u8179\u90e8", "\u9aa8\u76e4", "\u4e0a\u80a2", "\u4e0b\u80a2", "\u80cc\u90e8", "\u305d\u306e\u4ed6"] as const;

function stateDetail(id: string, label: string) {
  return { id, label, kind: "state" as FindingDetailKind, options: YES_NO_UNABLE_OPTIONS };
}

function selectDetail(id: string, label: string, options: readonly string[]) {
  return { id, label, kind: "select" as FindingDetailKind, options };
}

function textDetail(id: string, label: string) {
  return { id, label, kind: "text" as FindingDetailKind };
}

function numberDetail(id: string, label: string) {
  return { id, label, kind: "number" as FindingDetailKind };
}

function timeDetail(id: string, label: string) {
  return { id, label, kind: "time" as FindingDetailKind };
}

export const CASE_FINDING_SECTIONS_V2: readonly CaseFindingSectionDefinition[] = [
  {
    id: "common",
    label: "\u57fa\u672c\u6240\u898b",
    items: [
      {
        id: "headache",
        label: "\u982d\u75db",
        details: [
          selectDetail("quality", "\u6027\u72b6", PAIN_QUALITY_OPTIONS),
          textDetail("onsetAction", "\u767a\u75c7\u6642\u306e\u52d5\u4f5c"),
        ],
      },
      { id: "nausea", label: "\u5614\u6c17", details: [] },
      {
        id: "vomit",
        label: "\u5614\u5410",
        details: [
          numberDetail("count", "\u56de\u6570"),
          selectDetail("content", "\u6027\u72b6", VOMIT_CONTENT_OPTIONS),
        ],
      },
      {
        id: "dyspnea",
        label: "\u547c\u5438\u56f0\u96e3",
        details: [
          selectDetail("respPattern", "\u547c\u5438\u5f62\u614b", RESP_PATTERN_OPTIONS),
          textDetail("abnormalBreathing", "\u7570\u5e38\u547c\u5438"),
          selectDetail("breathSound", "\u547c\u5438\u97f3", BREATH_SOUND_OPTIONS),
          textDetail("site", "\u90e8\u4f4d"),
          textDetail("action", "\u767a\u75c7\u6642\u306e\u52d5\u4f5c"),
        ],
      },
      { id: "cyanosis", label: "\u30c1\u30a2\u30ce\u30fc\u30bc", details: [] },
      {
        id: "convulsion",
        label: "\u75d9\u6518",
        details: [textDetail("type", "\u75d9\u6518\u306e\u6027\u72b6")],
      },
      { id: "sweat", label: "\u767a\u6c57", details: [] },
      { id: "cold-sweat", label: "\u51b7\u6c57", details: [] },
    ],
  },
  {
    id: "cardio",
    label: "\u5faa\u74b0\u5668",
    items: [
      {
        id: "chest-pain",
        label: "\u80f8\u75db",
        details: [
          selectDetail("quality", "\u6027\u72b6", PAIN_QUALITY_OPTIONS),
          numberDetail("nrs", "NRS"),
          stateDetail("radiation", "\u653e\u6563\u75db"),
          textDetail("radiationDestination", "\u653e\u6563\u5148"),
          textDetail("onsetAction", "\u767a\u75c7\u6642\u306e\u52d5\u4f5c"),
        ],
      },
      {
        id: "back-pain",
        label: "\u80cc\u90e8\u75db",
        details: [
          selectDetail("quality", "\u6027\u72b6", PAIN_QUALITY_OPTIONS),
          numberDetail("nrs", "NRS"),
          stateDetail("movingPain", "\u79fb\u52d5\u75db"),
          textDetail("movingPainDestination", "\u79fb\u52d5\u5148"),
        ],
      },
      {
        id: "palpitation",
        label: "\u52d5\u60b8",
        details: [
          selectDetail("historyType", "\u521d\u56de\u304b\u65e2\u5f80\u304b", PALPITATION_HISTORY_OPTIONS),
          numberDetail("count", "\u983b\u5ea6"),
          stateDetail("visitHistory", "\u53d7\u8a3a\u6b74"),
          textDetail("diagnosis", "\u8a3a\u65ad\u540d"),
        ],
      },
      {
        id: "edema",
        label: "\u6d6e\u816b",
        details: [
          selectDetail("distribution", "\u90e8\u4f4d", EDEMA_DISTRIBUTION_OPTIONS),
          selectDetail("course", "\u7d4c\u904e", ["\u6162\u6027", "\u6025\u6027"] as const),
        ],
      },
      {
        id: "syncope",
        label: "\u5931\u795e",
        details: [
          stateDetail("ongoing", "\u7d99\u7d9a\u306e\u6709\u7121"),
          textDetail("duration", "\u6301\u7d9a\u6642\u9593"),
        ],
      },
    ],
  },
  {
    id: "respiratory",
    label: "\u547c\u5438\u5668",
    items: [
      { id: "cough", label: "\u54b3\u55fd", details: [selectDetail("type", "\u7a2e\u985e", COUGH_OPTIONS)] },
      { id: "nasal-discharge", label: "\u9f3b\u6c41", details: [textDetail("quality", "\u6027\u72b6")] },
      {
        id: "sputum",
        label: "\u5580\u75f0",
        details: [
          selectDetail("quality", "\u6027\u72b6", SPUTUM_OPTIONS),
          stateDetail("bloody", "\u8840\u6027"),
        ],
      },
    ],
  },
  {
    id: "digestive",
    label: "\u6d88\u5316\u5668",
    items: [
      {
        id: "abdominal-pain",
        label: "\u8179\u75db",
        details: [
          selectDetail("region", "\u90e8\u4f4d", ABDOMINAL_REGION_OPTIONS),
          stateDetail("tenderness", "\u5727\u75db"),
          stateDetail("rebound", "\u53cd\u8df3\u75db"),
          stateDetail("guarding", "\u7b4b\u6027\u9632\u5fa1"),
          numberDetail("nrs", "NRS"),
        ],
      },
      { id: "diarrhea", label: "\u4e0b\u75e2", details: [numberDetail("count", "\u56de\u6570")] },
      {
        id: "hematemesis-melena",
        label: "\u5410\u8840\u30fb\u4e0b\u8840",
        details: [
          numberDetail("count", "\u56de\u6570"),
          selectDetail("color", "\u8272\u8abf", STOOL_COLOR_OPTIONS),
          textDetail("amount", "\u91cf"),
        ],
      },
      { id: "constipation", label: "\u4fbf\u79d8", details: [timeDetail("lastBowelMovement", "\u6700\u7d42\u6392\u4fbf\u6642\u9593")] },
      { id: "jaundice", label: "\u9ec4\u75b8", details: [] },
      { id: "abdominal-distension", label: "\u8179\u90e8\u81a8\u6e80", details: [] },
    ],
  },
  {
    id: "neuro",
    label: "\u795e\u7d4c",
    items: [
      { id: "consciousness-disturbance", label: "\u610f\u8b58\u969c\u5bb3", details: [timeDetail("duration", "\u6301\u7d9a\u6642\u9593")] },
      {
        id: "paralysis",
        label: "\u9ebb\u75fa",
        details: [
          selectDetail("site", "\u90e8\u4f4d", PARALYSIS_SITE_OPTIONS),
          selectDetail("quality", "\u6027\u72b6", PARALYSIS_QUALITY_OPTIONS),
          timeDetail("onsetTime", "\u767a\u75c7\u6642\u9593"),
          timeDetail("lastKnownWell", "\u6700\u7d42\u5065\u5e38\u78ba\u8a8d\u6642\u9593"),
          stateDetail("facialParalysis", "\u9854\u9762\u9ebb\u75fa"),
          stateDetail("languageDisturbance", "\u8a00\u8a9e\u969c\u5bb3"),
          stateDetail("visualFieldDefect", "\u8996\u91ce\u969c\u5bb3"),
        ],
      },
      { id: "sensory-disturbance", label: "\u611f\u899a\u969c\u5bb3", details: [] },
    ],
  },
  {
    id: "urinary",
    label: "\u6ccc\u5c3f\u5668",
    items: [
      {
        id: "dysuria",
        label: "\u6392\u5c3f\u969c\u5bb3",
        details: [stateDetail("oliguria", "\u4e4f\u5c3f"), stateDetail("frequency", "\u983b\u5c3f")],
      },
      {
        id: "urinary-pain",
        label: "\u75bc\u75db",
        details: [
          stateDetail("painOnUrination", "\u6392\u5c3f\u6642\u75db"),
          stateDetail("lowerBackPain", "\u8170\u75db"),
          stateDetail("flankPain", "\u5074\u8179\u90e8\u75db"),
        ],
      },
    ],
  },
  {
    id: "musculoskeletal",
    label: "\u904b\u52d5\u5668",
    items: [
      {
        id: "external-injury",
        label: "\u5916\u50b7",
        details: [
          selectDetail("site", "\u90e8\u4f4d", MUSCULOSKELETAL_SITE_OPTIONS),
          stateDetail("bleeding", "\u51fa\u8840"),
          stateDetail("deformity", "\u5909\u5f62"),
          stateDetail("swelling", "\u816b\u8139"),
          stateDetail("tenderness", "\u5727\u75db"),
          stateDetail("rangeOfMotionLimit", "\u53ef\u52d5\u57df\u5236\u9650"),
        ],
      },
    ],
  },
] as const;

export function createEmptyCaseFindings(): CaseFindings {
  return Object.fromEntries(
    CASE_FINDING_SECTIONS_V2.map((section) => [
      section.id,
      Object.fromEntries(
        section.items.map((item) => [
          item.id,
          {
            state: "unselected",
            details: Object.fromEntries(
              item.details.map((detail) => [detail.id, detail.kind === "state" ? "unselected" : ""] as [string, FindingDetailValue]),
            ),
          },
        ]),
      ),
    ]),
  ) as CaseFindings;
}
