export const TRAUMA_REGION_OPTIONS = [
  "頭部",
  "顔面",
  "体幹部",
  "上肢",
  "下肢",
  "その他",
] as const;

export const TRAUMA_SITE_OPTIONS: Record<string, readonly string[]> = {
  頭部: ["頭頂部", "側頭部", "前頭部", "後頭部", "その他"],
  顔面: ["前額部", "右頬", "左頬", "右下顎", "左下顎", "上口唇", "下口唇", "鼻根部", "鼻先部", "その他"],
  体幹部: [
    "胸部",
    "側胸部",
    "季肋部",
    "腹部",
    "下腹部",
    "右側腹部",
    "左側腹部",
    "鎖骨付近",
    "右肩甲骨付近",
    "左肩甲骨付近",
    "右背部",
    "左背部",
    "右腰部",
    "左腰部",
    "その他",
  ],
  上肢: [
    "右肩関節",
    "右肘関節",
    "右手関節",
    "右上腕",
    "右前腕",
    "右手背",
    "右手掌",
    "左肩関節",
    "左肘関節",
    "左手関節",
    "左上腕",
    "左前腕",
    "左手背",
    "左手掌",
    "その他",
  ],
  下肢: [
    "右股関節",
    "右大腿部",
    "右膝関節",
    "右下腿部",
    "右足関節",
    "右足背",
    "右足底",
    "左股関節",
    "左大腿部",
    "左膝関節",
    "左下腿部",
    "左足関節",
    "左足背",
    "左足底",
    "その他",
  ],
  その他: ["その他"],
};

export const TRAUMA_BLEEDING_OPTIONS = [
  "出血なし",
  "少量出血",
  "中等量出血",
  "大量出血",
  "持続出血",
  "間欠的出血",
  "拍動性出血",
  "静脈性出血",
  "毛細血管性出血",
  "血腫あり",
  "血腫拡大あり",
  "再出血あり",
] as const;

export const TRAUMA_WOUND_TYPE_OPTIONS = [
  "切創",
  "裂創",
  "刺創",
  "挫創",
  "擦過創",
  "咬創",
  "剥皮創",
  "熱傷",
] as const;

export const TRAUMA_ROW_ITEM_IDS = Array.from({ length: 10 }, (_, index) => `external-injury-${index + 1}`) as readonly string[];

export function isTraumaItemId(itemId: string): boolean {
  return TRAUMA_ROW_ITEM_IDS.includes(itemId);
}

export function getTraumaItemNumber(itemId: string): number | null {
  const matched = itemId.match(/^external-injury-(\d+)$/);
  if (!matched) return null;
  return Number(matched[1]);
}

export function getTraumaSiteOptions(region: string): readonly string[] {
  return TRAUMA_SITE_OPTIONS[region] ?? TRAUMA_SITE_OPTIONS["その他"];
}
