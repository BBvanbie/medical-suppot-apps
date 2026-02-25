export type CaseRecord = {
  caseId: string;
  division: "1部" | "2部" | "3部";
  awareDate: string;
  awareTime: string;
  address: string;
  name: string;
  age: number;
  destination?: string;
  symptom: string;
  triageLevel: "high" | "mid" | "low";
  note: string;
};

export const mockCases: CaseRecord[] = [
  {
    caseId: "C-260225-001",
    division: "1部",
    awareDate: "2/23",
    awareTime: "8:14",
    address: "世田谷区三軒茶屋2-5-1",
    name: "山田 太郎",
    age: 74,
    destination: "都立広域医療センター",
    symptom: "胸痛",
    triageLevel: "high",
    note: "現場で酸素投与を開始。",
  },
  {
    caseId: "C-260225-002",
    division: "2部",
    awareDate: "2/23",
    awareTime: "9:42",
    address: "大田区蒲田4-10-6",
    name: "佐藤 花子",
    age: 63,
    destination: "蒲田総合病院",
    symptom: "呼吸困難",
    triageLevel: "high",
    note: "家族へ現場で説明済み。",
  },
  {
    caseId: "C-260225-003",
    division: "3部",
    awareDate: "2/23",
    awareTime: "11:07",
    address: "品川区南大井6-18-3",
    name: "伊藤 健",
    age: 58,
    symptom: "めまい",
    triageLevel: "mid",
    note: "搬送中バイタル安定。",
  },
  {
    caseId: "C-260225-004",
    division: "1部",
    awareDate: "2/24",
    awareTime: "0:38",
    address: "目黒区自由が丘1-8-12",
    name: "中村 恵",
    age: 81,
    destination: "目黒救命センター",
    symptom: "脳卒中疑い",
    triageLevel: "high",
    note: "発症推定時刻 00:15。",
  },
  {
    caseId: "C-260225-005",
    division: "2部",
    awareDate: "2/24",
    awareTime: "2:15",
    address: "港区芝公園3-2-8",
    name: "鈴木 誠",
    age: 69,
    symptom: "転倒外傷",
    triageLevel: "mid",
    note: "大腿骨骨折疑い。",
  },
  {
    caseId: "C-260225-006",
    division: "3部",
    awareDate: "2/24",
    awareTime: "4:51",
    address: "渋谷区恵比寿西1-15-2",
    name: "高橋 優",
    age: 47,
    destination: "代官山病院",
    symptom: "頭部外傷",
    triageLevel: "mid",
    note: "意識消失なし。",
  },
  {
    caseId: "C-260225-007",
    division: "1部",
    awareDate: "2/24",
    awareTime: "6:09",
    address: "杉並区阿佐谷南3-7-5",
    name: "小林 進",
    age: 76,
    destination: "杉並中央病院",
    symptom: "発熱・意識混濁",
    triageLevel: "high",
    note: "現場で高熱を確認。",
  },
  {
    caseId: "C-260225-008",
    division: "2部",
    awareDate: "2/24",
    awareTime: "10:36",
    address: "練馬区豊玉北5-20-4",
    name: "加藤 明美",
    age: 66,
    symptom: "腹痛",
    triageLevel: "mid",
    note: "4時間前から疼痛持続。",
  },
  {
    caseId: "C-260225-009",
    division: "3部",
    awareDate: "2/24",
    awareTime: "14:02",
    address: "中野区本町2-12-9",
    name: "清水 亮",
    age: 52,
    destination: "中野医療センター",
    symptom: "アレルギー反応",
    triageLevel: "mid",
    note: "自己注射薬を使用済み。",
  },
  {
    caseId: "C-260225-010",
    division: "1部",
    awareDate: "2/24",
    awareTime: "18:27",
    address: "新宿区西新宿6-4-7",
    name: "松本 舞",
    age: 35,
    symptom: "強い頭痛",
    triageLevel: "low",
    note: "神経学的異常所見なし。",
  },
];

export function getCaseById(caseId: string) {
  return mockCases.find((item) => item.caseId === caseId);
}
