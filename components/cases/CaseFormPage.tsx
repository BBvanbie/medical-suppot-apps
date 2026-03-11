"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CaseFormSummaryTab } from "@/components/cases/CaseFormSummaryTab";
import { CaseFormBasicTab } from "@/components/cases/CaseFormBasicTab";
import {
  renderCardioFindingBody,
  renderDigestiveFindingBody,
  renderNeuroFindingBody,
  renderTraumaFindingSection,
} from "@/components/cases/CaseFindingBodies";
import {
  createChangedDetailMap,
} from "@/components/cases/CaseFindingSummary";
import { buildCaseSummaryData } from "@/components/cases/CaseFormSummaryData";
import { CaseFormVitalsTab } from "@/components/cases/CaseFormVitalsTab";
import { CaseSendHistoryTable } from "@/components/cases/CaseSendHistoryTable";
import { Sidebar } from "@/components/home/Sidebar";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import {
  createCaseRecord,
  fetchCaseConsultDetail,
  sendCaseConsultReply,
  updateTransportDecision,
  type TransportDecisionPayload,
} from "@/lib/casesClient";
import { TRANSPORT_DECLINED_REASON_OPTIONS, type TransportDeclinedReasonCode } from "@/lib/decisionReasons";
import type { CaseRecord } from "@/lib/mockCases";

type CaseFormPageProps = {
  mode: "create" | "edit";
  initialCase?: CaseRecord;
  initialPayload?: unknown;
  operatorName?: string;
  operatorCode?: string;
  readOnly?: boolean;
};

type TabId = "basic" | "vitals" | "summary" | "history";
type BirthType = "western" | "japanese";
type Era = "reiwa" | "heisei" | "showa";
type Gender = "male" | "female" | "unknown";
type Arrhythmia = "yes" | "no" | "unknown";
type ConsciousnessType = "jcs" | "gcs";
type DnarOption = "" | "full_code" | "dnar" | "other";

type PastHistory = {
  disease: string;
  clinic: string;
};

type RelatedPerson = {
  name: string;
  relation: string;
  phone: string;
};

type SendHistoryItem = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: "未読" | "既読" | "要相談" | "受入可能" | "受入不可" | "搬送決定" | "辞退";
  hospitalName?: string;
  selectedDepartments?: string[];
  canDecide?: boolean;
  canConsult?: boolean;
  consultComment?: string;
  emsReplyComment?: string;
};

type ConsultMessage = {
  id: number;
  actor: "A" | "HP";
  actedAt: string;
  note: string;
};

type CaseDispatchContext = {
  awareDate: string;
  awareTime: string;
  dispatchAddress: string;
};

type VitalSet = {
  measuredAt: string;
  consciousnessType: ConsciousnessType;
  consciousnessValue: string;
  respiratoryRate: string;
  respiratoryPattern: string;
  breathOdor: string;
  pulseRate: string;
  ecg: string;
  arrhythmia: Arrhythmia;
  bpRightSystolic: string;
  bpRightDiastolic: string;
  bpLeftSystolic: string;
  bpLeftDiastolic: string;
  spo2: string;
  pupilRight: string;
  pupilLeft: string;
  lightReflexRight: string;
  lightReflexLeft: string;
  gazeRight: string;
  gazeLeft: string;
  temperature: string;
  temperatureUnavailable: boolean;
};

type FindingMiddle = {
  id: string;
  label: string;
  children: string[];
};

type FindingMajor = {
  id: string;
  label: string;
  items: FindingMiddle[];
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "basic", label: "基本情報" },
  { id: "vitals", label: "要請概要・バイタル" },
  { id: "summary", label: "患者サマリー" },
  { id: "history", label: "送信履歴" },
];

const ADL_OPTIONS = ["自立", "要支援1", "要支援2", "要介護1", "要介護2", "要介護3", "要介護4", "要介護5"];
const RESPIRATORY_PATTERNS = ["異常なし", "クスマウル大呼吸", "ビオー呼吸", "下顎呼吸", "喘鳴"];
const BREATH_ODORS = ["異常なし", "アルコール臭", "アセトン臭"];
const ECG_OPTIONS = ["洞調律", "VF", "VT", "PAC", "PVC", "wideQRS", "ST上昇", "ST低下", "af"];
const LIGHT_REFLEX_OPTIONS = ["正常", "緩慢", "俊敏", "なし"];
const GAZE_OPTIONS = ["なし", "左方偏視", "右方偏視", "上転"];
const JCS_OPTIONS = ["0", "1", "2", "3", "10", "20", "30", "100", "200", "300"];
const GCS_E_OPTIONS = ["1", "2", "3", "4"];
const GCS_V_OPTIONS = ["1", "2", "3", "4", "5"];
const GCS_M_OPTIONS = ["1", "2", "3", "4", "5", "6"];
const ACTION_OPTIONS = ["安静", "起床後", "就寝中", "運動中", "歩行中", "軽作業中", "その他"];
const COURSE_OPTIONS = ["突発", "徐々に", "改善傾向", "増悪傾向", "持続"];
const ABDOMINAL_REGION_OPTIONS = [
  "右上腹部",
  "心窩部",
  "左上腹部",
  "右側腹部",
  "臍部",
  "左側腹部",
  "右下腹部",
  "下腹部",
  "左下腹部",
];
const FINDING_SECTIONS: FindingMajor[] = [
  {
    id: "neuro",
    label: "神経所見",
    items: [
      { id: "headache", label: "頭痛", children: [] },
      { id: "nausea", label: "嘔気", children: [] },
      { id: "vomit", label: "嘔吐", children: [] },
      { id: "dizziness", label: "めまい", children: [] },
      { id: "numbness", label: "しびれ", children: [] },
      { id: "paralysis", label: "麻痺", children: [] },
    ],
  },
  {
    id: "cardio",
    label: "循環器所見",
    items: [
      { id: "chest-pain", label: "胸痛", children: [] },
      { id: "chest-discomfort", label: "胸部違和感", children: [] },
      { id: "palpitation", label: "動悸", children: [] },
      { id: "jvd", label: "頸静脈怒張", children: [] },
      { id: "edema", label: "浮腫", children: [] },
    ],
  },
  {
    id: "resp",
    label: "呼吸器所見",
    items: [
      { id: "dyspnea", label: "呼吸苦", children: ["小項目A", "小項目B"] },
      { id: "wheezing", label: "喘鳴", children: ["小項目A", "小項目B"] },
    ],
  },
  {
    id: "digestive",
    label: "消化器所見",
    items: [
      { id: "abdominal-pain", label: "腹痛", children: [] },
      { id: "back-pain", label: "腰背部痛", children: [] },
      { id: "gi-nausea", label: "嘔気", children: [] },
      { id: "gi-vomit", label: "嘔吐", children: [] },
      { id: "diarrhea", label: "下痢", children: [] },
      { id: "hematemesis", label: "吐血", children: [] },
      { id: "melena", label: "下血", children: [] },
      { id: "abdominal-abnormal", label: "腹部異常所見", children: [] },
    ],
  },
  {
    id: "trauma",
    label: "外傷所見",
    items: [
      { id: "face-head", label: "顔面頭部", children: [] },
      { id: "neck", label: "頸部", children: [] },
      { id: "trunk", label: "体幹部", children: [] },
      { id: "pelvis", label: "骨盤", children: [] },
      { id: "upper-limb", label: "上肢", children: [] },
      { id: "lower-limb", label: "下肢", children: [] },
    ],
  },
];

function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function parseWesternDateParts(value: string): { year: string; month: string; day: string } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { year: "", month: "", day: "" };
  return { year: m[1], month: m[2], day: m[3] };
}

function formatPupilInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (digits.length <= 1) return digits;
  return `${digits[0]}.${digits[1]}`;
}

function formatTemperatureInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 3);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}.${digits[2]}`;
}

function calcAge(d: Date | null) {
  if (!d) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? String(age) : "";
}

function toDate(era: Era, eraYear: string, month: string, day: string, western: string, type: BirthType) {
  if (type === "western") {
    if (!western) return null;
    const d = new Date(western);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (!eraYear || !month || !day) return null;
  const base: Record<Era, number> = { reiwa: 2018, heisei: 1988, showa: 1925 };
  const d = new Date(base[era] + Number(eraYear), Number(month) - 1, Number(day));
  return Number.isNaN(d.getTime()) ? null : d;
}

function createEmptyVital(): VitalSet {
  return {
    measuredAt: "",
    consciousnessType: "jcs",
    consciousnessValue: "",
    respiratoryRate: "",
    respiratoryPattern: RESPIRATORY_PATTERNS[0],
    breathOdor: BREATH_ODORS[0],
    pulseRate: "",
    ecg: ECG_OPTIONS[0],
    arrhythmia: "unknown",
    bpRightSystolic: "",
    bpRightDiastolic: "",
    bpLeftSystolic: "",
    bpLeftDiastolic: "",
    spo2: "",
    pupilRight: "",
    pupilLeft: "",
    lightReflexRight: LIGHT_REFLEX_OPTIONS[0],
    lightReflexLeft: LIGHT_REFLEX_OPTIONS[0],
    gazeRight: GAZE_OPTIONS[0],
    gazeLeft: GAZE_OPTIONS[0],
    temperature: "",
    temperatureUnavailable: false,
  };
}

function parseGcsValue(raw: string): { e: string; v: string; m: string } {
  const e = raw.match(/E([1-4])/i)?.[1] ?? "";
  const v = raw.match(/V([1-5])/i)?.[1] ?? "";
  const m = raw.match(/M([1-6])/i)?.[1] ?? "";
  return { e, v, m };
}

function composeGcsValue(e: string, v: string, m: string): string {
  return `${e ? `E${e}` : ""}${v ? `V${v}` : ""}${m ? `M${m}` : ""}`;
}

function normalizeVital(input?: Partial<VitalSet>): VitalSet {
  return {
    ...createEmptyVital(),
    ...(input ?? {}),
  };
}

function getNowAwareDateTime() {
  const now = new Date();
  const awareDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const awareTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { awareDate, awareTime };
}

function generateCaseId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `C-${y}${m}${d}-${hh}${mm}${ss}`;
}

function PastHistoryRow({
  index,
  value,
  onChange,
}: {
  index: number;
  value: PastHistory;
  onChange: (value: PastHistory) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const q = value.clinic.trim();
    if (!q) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hospitals/suggest?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { hospitals: string[] };
        setSuggestions(data.hospitals ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value.clinic]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">既往歴 {index + 1}</p>
      <div className="grid grid-cols-12 gap-3">
        <label className="col-span-4">
          <span className="mb-1 block text-[11px] font-semibold text-slate-500">病名</span>
          <input
            value={value.disease}
            onChange={(e) => onChange({ ...value, disease: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <label className="relative col-span-8">
          <span className="mb-1 block text-[11px] font-semibold text-slate-500">かかりつけ（自由入力可）</span>
          <input
            value={value.clinic}
            onChange={(e) => {
              const nextClinic = e.target.value;
              onChange({ ...value, clinic: nextClinic });
              if (!nextClinic.trim()) {
                setSuggestions([]);
              }
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          {showSuggestions && value.clinic.trim().length > 0 && suggestions.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-slate-200 bg-white">
              {suggestions.map((name) => (
                <li key={`${index}-${name}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange({ ...value, clinic: name });
                      setShowSuggestions(false);
                    }}
                    className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
      </div>
    </div>
  );
}

export function CaseFormPage({ mode, initialCase, initialPayload, operatorName, operatorCode, readOnly = false }: CaseFormPageProps) {
  const router = useRouter();
  const initial = (initialPayload ?? {}) as Record<string, unknown>;
  const initialBasic = (initial.basic ?? {}) as Record<string, unknown>;
  const initialSummary = (initial.summary ?? {}) as Record<string, unknown>;
  const initialFindings = (initial.findings ?? {}) as Record<string, unknown>;
  const neuro = (initialFindings.neuro ?? {}) as Record<string, unknown>;
  const cardio = (initialFindings.cardio ?? {}) as Record<string, unknown>;
  const digestive = (initialFindings.digestive ?? {}) as Record<string, unknown>;
  const trauma = (initialFindings.trauma ?? {}) as Record<string, unknown>;

  const initialRelatedPeople = Array.isArray(initialBasic.relatedPeople)
    ? (initialBasic.relatedPeople as RelatedPerson[]).slice(0, 3)
    : [];
  while (initialRelatedPeople.length < 3) {
    initialRelatedPeople.push({ name: "", relation: "", phone: "" });
  }

  const initialPastHistories = Array.isArray(initialBasic.pastHistories)
    ? (initialBasic.pastHistories as PastHistory[]).slice(0, 6)
    : [];
  while (initialPastHistories.length < 6) {
    initialPastHistories.push({ disease: "", clinic: "" });
  }

  const initialVitals = Array.isArray(initial.vitals)
    ? (initial.vitals as Array<Partial<VitalSet>>).map((v) => normalizeVital(v))
    : [createEmptyVital()];
  const initialSendHistory = Array.isArray(initial.sendHistory) ? (initial.sendHistory as SendHistoryItem[]) : [];

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [caseId] = useState((initialBasic.caseId as string) ?? initialCase?.caseId ?? generateCaseId());
  const initialDispatch = (initial.dispatch ?? {}) as Record<string, unknown>;
  const fallbackAware = getNowAwareDateTime();
  const [dispatchContext, setDispatchContext] = useState<CaseDispatchContext>({
    awareDate:
      (initialDispatch.awareDate as string) ??
      (initialBasic.awareDate as string) ??
      initialCase?.awareDate ??
      fallbackAware.awareDate,
    awareTime:
      (initialDispatch.awareTime as string) ??
      (initialBasic.awareTime as string) ??
      initialCase?.awareTime ??
      fallbackAware.awareTime,
    dispatchAddress:
      (initialDispatch.dispatchAddress as string) ??
      (initialBasic.dispatchAddress as string) ??
      initialCase?.address ??
      "",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const [name, setName] = useState((initialBasic.name as string) ?? initialCase?.name ?? "");
  const [nameUnknown, setNameUnknown] = useState(Boolean(initialBasic.nameUnknown ?? false));
  const [gender, setGender] = useState<Gender>(((initialBasic.gender as Gender) ?? "unknown"));
  const [birthType, setBirthType] = useState<BirthType>(((initialBasic.birthType as BirthType) ?? "western"));
  const [birthDateWestern, setBirthDateWestern] = useState((initialBasic.birthDateWestern as string) ?? "");
  const initialWesternParts = parseWesternDateParts((initialBasic.birthDateWestern as string) ?? "");
  const [birthWesternYear, setBirthWesternYear] = useState(initialWesternParts.year);
  const [birthWesternMonth, setBirthWesternMonth] = useState(initialWesternParts.month);
  const [birthWesternDay, setBirthWesternDay] = useState(initialWesternParts.day);
  const [birthEra, setBirthEra] = useState<Era>(((initialBasic.birthEra as Era) ?? "reiwa"));
  const [birthEraYear, setBirthEraYear] = useState((initialBasic.birthEraYear as string) ?? "");
  const [birthMonth, setBirthMonth] = useState((initialBasic.birthMonth as string) ?? "");
  const [birthDay, setBirthDay] = useState((initialBasic.birthDay as string) ?? "");
  const westernMonthRef = useRef<HTMLInputElement | null>(null);
  const westernDayRef = useRef<HTMLInputElement | null>(null);
  const [address, setAddress] = useState((initialBasic.address as string) ?? initialCase?.address ?? "");
  const [phone, setPhone] = useState((initialBasic.phone as string) ?? "");
  const [adl, setAdl] = useState((initialBasic.adl as string) ?? "");
  const [dnarOption, setDnarOption] = useState<DnarOption>(((initialBasic.dnarOption as DnarOption) ?? ""));
  const [dnarOther, setDnarOther] = useState((initialBasic.dnarOther as string) ?? "");
  const [allergy, setAllergy] = useState((initialBasic.allergy as string) ?? "");
  const [weight, setWeight] = useState((initialBasic.weight as string) ?? "");
  const [relatedPeople, setRelatedPeople] = useState<RelatedPerson[]>(initialRelatedPeople);
  const [pastHistories, setPastHistories] = useState<PastHistory[]>(initialPastHistories);
  const [specialNote, setSpecialNote] = useState((initialBasic.specialNote as string) ?? "");

  const [dispatchSummary, setDispatchSummary] = useState((initialSummary.dispatchSummary as string) ?? "");
  const [chiefComplaint, setChiefComplaint] = useState((initialSummary.chiefComplaint as string) ?? "");
  const [vitals, setVitals] = useState<VitalSet[]>(initialVitals.length > 0 ? initialVitals : [createEmptyVital()]);
  const [activeVitalIndex, setActiveVitalIndex] = useState(0);
  const [openMajorIds, setOpenMajorIds] = useState<string[]>([]);
  const [openMiddleIds, setOpenMiddleIds] = useState<string[]>([]);
  const [sendHistory, setSendHistory] = useState<SendHistoryItem[]>(initialSendHistory);
  const [decisionPendingByRequest, setDecisionPendingByRequest] = useState<Record<string, boolean>>({});
  const [decisionConfirm, setDecisionConfirm] = useState<{
    targetId: number;
    action: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
  } | null>(null);
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultTarget, setConsultTarget] = useState<SendHistoryItem | null>(null);
  const [consultMessages, setConsultMessages] = useState<ConsultMessage[]>([]);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState("");
  const [consultNote, setConsultNote] = useState("");
  const [consultSending, setConsultSending] = useState(false);
  const [consultDecisionConfirm, setConsultDecisionConfirm] = useState<"TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | null>(null);
  const [transportDeclineReasonCode, setTransportDeclineReasonCode] = useState<TransportDeclinedReasonCode | "">("");
  const [transportDeclineReasonText, setTransportDeclineReasonText] = useState("");
  const [transportDeclineReasonError, setTransportDeclineReasonError] = useState("");

  const [headachePositive, setHeadachePositive] = useState(Boolean(neuro.headachePositive ?? false));
  const [headacheQuality, setHeadacheQuality] = useState((neuro.headacheQuality as string) ?? "拍動性");
  const [headacheAction, setHeadacheAction] = useState((neuro.headacheAction as string) ?? ACTION_OPTIONS[0]);
  const [headacheActionOther, setHeadacheActionOther] = useState((neuro.headacheActionOther as string) ?? "");
  const [headacheCourse, setHeadacheCourse] = useState((neuro.headacheCourse as string) ?? COURSE_OPTIONS[0]);
  const [headacheOther, setHeadacheOther] = useState((neuro.headacheOther as string) ?? "");

  const [nauseaPositive, setNauseaPositive] = useState(Boolean(neuro.nauseaPositive ?? false));
  const [nauseaCourse, setNauseaCourse] = useState((neuro.nauseaCourse as string) ?? COURSE_OPTIONS[0]);
  const [nauseaOther, setNauseaOther] = useState((neuro.nauseaOther as string) ?? "");

  const [vomitPositive, setVomitPositive] = useState(Boolean(neuro.vomitPositive ?? false));
  const [vomitQuality, setVomitQuality] = useState((neuro.vomitQuality as string) ?? "食残");
  const [vomitCountMode, setVomitCountMode] = useState<"estimated" | "confirmed">(((neuro.vomitCountMode as "estimated" | "confirmed") ?? "confirmed"));
  const [vomitCountConfirmed, setVomitCountConfirmed] = useState((neuro.vomitCountConfirmed as string) ?? "");
  const [vomitCountMin, setVomitCountMin] = useState((neuro.vomitCountMin as string) ?? "");
  const [vomitCountMax, setVomitCountMax] = useState((neuro.vomitCountMax as string) ?? "");
  const [vomitOther, setVomitOther] = useState((neuro.vomitOther as string) ?? "");

  const [dizzinessPositive, setDizzinessPositive] = useState(Boolean(neuro.dizzinessPositive ?? false));
  const [dizzinessType, setDizzinessType] = useState((neuro.dizzinessType as string) ?? "回転性");
  const [dizzinessAction, setDizzinessAction] = useState((neuro.dizzinessAction as string) ?? ACTION_OPTIONS[0]);
  const [dizzinessActionOther, setDizzinessActionOther] = useState((neuro.dizzinessActionOther as string) ?? "");
  const [dizzinessCourse, setDizzinessCourse] = useState((neuro.dizzinessCourse as string) ?? COURSE_OPTIONS[0]);
  const [dizzinessPast, setDizzinessPast] = useState(Boolean(neuro.dizzinessPast ?? false));
  const [dizzinessPastWhen, setDizzinessPastWhen] = useState((neuro.dizzinessPastWhen as string) ?? "");
  const [tinnitusPositive, setTinnitusPositive] = useState(Boolean(neuro.tinnitusPositive ?? false));
  const [earFullnessPositive, setEarFullnessPositive] = useState(Boolean(neuro.earFullnessPositive ?? false));

  const [numbnessPositive, setNumbnessPositive] = useState(Boolean(neuro.numbnessPositive ?? false));
  const [numbnessSite, setNumbnessSite] = useState((neuro.numbnessSite as string) ?? "");

  const [paralysisOnsetDate, setParalysisOnsetDate] = useState((neuro.paralysisOnsetDate as string) ?? "");
  const [paralysisOnsetTime, setParalysisOnsetTime] = useState((neuro.paralysisOnsetTime as string) ?? "");
  const [paralysisAction, setParalysisAction] = useState((neuro.paralysisAction as string) ?? ACTION_OPTIONS[0]);
  const [paralysisActionOther, setParalysisActionOther] = useState((neuro.paralysisActionOther as string) ?? "");
  const [paralysisLastKnownDate, setParalysisLastKnownDate] = useState((neuro.paralysisLastKnownDate as string) ?? "");
  const [paralysisLastKnownTime, setParalysisLastKnownTime] = useState((neuro.paralysisLastKnownTime as string) ?? "");
  const [paralysisSite, setParalysisSite] = useState((neuro.paralysisSite as string) ?? "");
  const [paralysisGaze, setParalysisGaze] = useState((neuro.paralysisGaze as string) ?? "左共同偏視");

  const [chestPainPositive, setChestPainPositive] = useState(Boolean(cardio.chestPainPositive ?? false));
  const [chestPainAction, setChestPainAction] = useState((cardio.chestPainAction as string) ?? ACTION_OPTIONS[0]);
  const [chestPainActionOther, setChestPainActionOther] = useState((cardio.chestPainActionOther as string) ?? "");
  const [chestPainLocation, setChestPainLocation] = useState((cardio.chestPainLocation as string) ?? "");
  const [chestPainQuality, setChestPainQuality] = useState((cardio.chestPainQuality as string) ?? "");
  const [chestPainRadiation, setChestPainRadiation] = useState(Boolean(cardio.chestPainRadiation ?? false));
  const [chestPainRadiationCourse, setChestPainRadiationCourse] = useState((cardio.chestPainRadiationCourse as string) ?? "");
  const [chestPainNrs, setChestPainNrs] = useState((cardio.chestPainNrs as string) ?? "0");
  const [coldSweatPositive, setColdSweatPositive] = useState(Boolean(cardio.coldSweatPositive ?? false));
  const [facialPallorPositive, setFacialPallorPositive] = useState(Boolean(cardio.facialPallorPositive ?? false));

  const [chestPressurePositive, setChestPressurePositive] = useState(Boolean(cardio.chestPressurePositive ?? false));
  const [chestDiscomfortPositive, setChestDiscomfortPositive] = useState(Boolean(cardio.chestDiscomfortPositive ?? false));

  const [palpitationAction, setPalpitationAction] = useState((cardio.palpitationAction as string) ?? ACTION_OPTIONS[0]);
  const [palpitationActionOther, setPalpitationActionOther] = useState((cardio.palpitationActionOther as string) ?? "");
  const [palpitationCourse, setPalpitationCourse] = useState((cardio.palpitationCourse as string) ?? COURSE_OPTIONS[0]);

  const [jvdPositive, setJvdPositive] = useState(Boolean(cardio.jvdPositive ?? false));
  const [respSound, setRespSound] = useState((cardio.respSound as string) ?? "正常");
  const [respSoundOther, setRespSoundOther] = useState((cardio.respSoundOther as string) ?? "");

  const [edemaPositive, setEdemaPositive] = useState(Boolean(cardio.edemaPositive ?? false));
  const [edemaUsual, setEdemaUsual] = useState(Boolean(cardio.edemaUsual ?? false));
  const [diureticsHistory, setDiureticsHistory] = useState(Boolean(cardio.diureticsHistory ?? false));

  const [abPainPositive, setAbPainPositive] = useState(Boolean(digestive.abPainPositive ?? false));
  const [abPainRegion, setAbPainRegion] = useState((digestive.abPainRegion as string) ?? ABDOMINAL_REGION_OPTIONS[4]);
  const [abPainQuality, setAbPainQuality] = useState((digestive.abPainQuality as string) ?? "");
  const [abTenderness, setAbTenderness] = useState(Boolean(digestive.abTenderness ?? false));
  const [abRebound, setAbRebound] = useState(Boolean(digestive.abRebound ?? false));
  const [abPainCourse, setAbPainCourse] = useState((digestive.abPainCourse as string) ?? COURSE_OPTIONS[0]);

  const [backPainPositive, setBackPainPositive] = useState(Boolean(digestive.backPainPositive ?? false));
  const [backPainSite, setBackPainSite] = useState((digestive.backPainSite as string) ?? "");
  const [backPainQuality, setBackPainQuality] = useState((digestive.backPainQuality as string) ?? "");
  const [cvaTenderness, setCvaTenderness] = useState(Boolean(digestive.cvaTenderness ?? false));
  const [dysuriaPain, setDysuriaPain] = useState(Boolean(digestive.dysuriaPain ?? false));
  const [hematuriaPositive, setHematuriaPositive] = useState(Boolean(digestive.hematuriaPositive ?? false));
  const [backAssociated, setBackAssociated] = useState((digestive.backAssociated as string) ?? "");

  const [giNauseaPositive, setGiNauseaPositive] = useState(Boolean(digestive.giNauseaPositive ?? false));
  const [giNauseaActionText, setGiNauseaActionText] = useState((digestive.giNauseaActionText as string) ?? "");
  const [giNauseaHeadache, setGiNauseaHeadache] = useState(Boolean(digestive.giNauseaHeadache ?? false));
  const [giNauseaDizziness, setGiNauseaDizziness] = useState(Boolean(digestive.giNauseaDizziness ?? false));
  const [giNauseaNumbness, setGiNauseaNumbness] = useState(Boolean(digestive.giNauseaNumbness ?? false));
  const [giNauseaOther, setGiNauseaOther] = useState((digestive.giNauseaOther as string) ?? "");
  const [giNauseaCourse, setGiNauseaCourse] = useState((digestive.giNauseaCourse as string) ?? COURSE_OPTIONS[0]);

  const [giVomitPositive, setGiVomitPositive] = useState(Boolean(digestive.giVomitPositive ?? false));
  const [giVomitCount, setGiVomitCount] = useState((digestive.giVomitCount as string) ?? "");

  const [diarrheaPositive, setDiarrheaPositive] = useState(Boolean(digestive.diarrheaPositive ?? false));
  const [diarrheaCount, setDiarrheaCount] = useState((digestive.diarrheaCount as string) ?? "");

  const [hematemesisPositive, setHematemesisPositive] = useState(Boolean(digestive.hematemesisPositive ?? false));
  const [hematemesisAmount, setHematemesisAmount] = useState((digestive.hematemesisAmount as string) ?? "");
  const [hematemesisColor, setHematemesisColor] = useState((digestive.hematemesisColor as string) ?? "鮮血");
  const [hematemesisCharacter, setHematemesisCharacter] = useState((digestive.hematemesisCharacter as string) ?? "血液のみ");

  const [melenaPositive, setMelenaPositive] = useState(Boolean(digestive.melenaPositive ?? false));
  const [melenaAmount, setMelenaAmount] = useState((digestive.melenaAmount as string) ?? "");
  const [melenaColor, setMelenaColor] = useState((digestive.melenaColor as string) ?? "鮮血");
  const [melenaCharacter, setMelenaCharacter] = useState((digestive.melenaCharacter as string) ?? "血液のみ");

  const [abDistension, setAbDistension] = useState(Boolean(digestive.abDistension ?? false));
  const [abBulge, setAbBulge] = useState(Boolean(digestive.abBulge ?? false));
  const [abBulgeRegion, setAbBulgeRegion] = useState((digestive.abBulgeRegion as string) ?? ABDOMINAL_REGION_OPTIONS[4]);
  const [boardLike, setBoardLike] = useState(Boolean(digestive.boardLike ?? false));

  const [faceHeadTrauma, setFaceHeadTrauma] = useState((trauma.faceHeadTrauma as string) ?? "");
  const [faceHeadNormal, setFaceHeadNormal] = useState(Boolean(trauma.faceHeadNormal ?? false));
  const [neckTrauma, setNeckTrauma] = useState((trauma.neckTrauma as string) ?? "");
  const [neckNormal, setNeckNormal] = useState(Boolean(trauma.neckNormal ?? false));
  const [trunkTrauma, setTrunkTrauma] = useState((trauma.trunkTrauma as string) ?? "");
  const [trunkNormal, setTrunkNormal] = useState(Boolean(trauma.trunkNormal ?? false));
  const [pelvisTrauma, setPelvisTrauma] = useState((trauma.pelvisTrauma as string) ?? "");
  const [pelvisNormal, setPelvisNormal] = useState(Boolean(trauma.pelvisNormal ?? false));
  const [upperLimbTrauma, setUpperLimbTrauma] = useState((trauma.upperLimbTrauma as string) ?? "");
  const [upperLimbNormal, setUpperLimbNormal] = useState(Boolean(trauma.upperLimbNormal ?? false));
  const [lowerLimbTrauma, setLowerLimbTrauma] = useState((trauma.lowerLimbTrauma as string) ?? "");
  const [lowerLimbNormal, setLowerLimbNormal] = useState(Boolean(trauma.lowerLimbNormal ?? false));

  const birthDate = useMemo(
    () => toDate(birthEra, birthEraYear, birthMonth, birthDay, birthDateWestern, birthType),
    [birthEra, birthEraYear, birthMonth, birthDay, birthDateWestern, birthType],
  );
  const age = calcAge(birthDate);
  const activeVital = vitals[activeVitalIndex];
  const dnarSummary = dnarOption === "full_code" ? "フルコード" : dnarOption === "dnar" ? "DNAR" : dnarOption === "other" ? dnarOther.trim() : "";

  const updateVital = <K extends keyof VitalSet>(key: K, value: VitalSet[K]) => {
    setVitals((prev) => prev.map((item, idx) => (idx === activeVitalIndex ? { ...item, [key]: value } : item)));
  };

  const addVitalFromCurrent = () => {
    if (vitals.length >= 3) return;
    const cloned: VitalSet = { ...vitals[activeVitalIndex], measuredAt: "" };
    setVitals((prev) => [...prev, cloned]);
    setActiveVitalIndex(vitals.length);
  };

  const toggleMajor = (id: string) => {
    setOpenMajorIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleMiddle = (id: string) => {
    setOpenMiddleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const gcsParts = parseGcsValue(activeVital.consciousnessValue);
  const consciousnessActive =
    activeVital.consciousnessType === "jcs"
      ? activeVital.consciousnessValue !== ""
      : Boolean(gcsParts.e && gcsParts.v && gcsParts.m);

  const findingMiddleChanged: Record<string, boolean> = {
    headache:
      headachePositive ||
      headacheQuality !== "拍動性" ||
      headacheAction !== ACTION_OPTIONS[0] ||
      headacheActionOther !== "" ||
      headacheCourse !== COURSE_OPTIONS[0] ||
      headacheOther !== "",
    nausea: nauseaPositive || nauseaCourse !== COURSE_OPTIONS[0] || nauseaOther !== "",
    vomit:
      vomitPositive ||
      vomitQuality !== "食残" ||
      vomitCountMode !== "confirmed" ||
      vomitCountConfirmed !== "" ||
      vomitCountMin !== "" ||
      vomitCountMax !== "" ||
      vomitOther !== "",
    dizziness:
      dizzinessPositive ||
      dizzinessType !== "回転性" ||
      dizzinessAction !== ACTION_OPTIONS[0] ||
      dizzinessActionOther !== "" ||
      dizzinessCourse !== COURSE_OPTIONS[0] ||
      dizzinessPast ||
      dizzinessPastWhen !== "" ||
      tinnitusPositive ||
      earFullnessPositive,
    numbness: numbnessPositive || numbnessSite !== "",
    paralysis:
      paralysisOnsetDate !== "" ||
      paralysisOnsetTime !== "" ||
      paralysisAction !== ACTION_OPTIONS[0] ||
      paralysisActionOther !== "" ||
      paralysisLastKnownDate !== "" ||
      paralysisLastKnownTime !== "" ||
      paralysisSite !== "" ||
      paralysisGaze !== "左共同偏視",
    "chest-pain":
      chestPainPositive ||
      chestPainAction !== ACTION_OPTIONS[0] ||
      chestPainActionOther !== "" ||
      chestPainLocation !== "" ||
      chestPainQuality !== "" ||
      chestPainRadiation ||
      chestPainRadiationCourse !== "" ||
      chestPainNrs !== "0" ||
      coldSweatPositive ||
      facialPallorPositive,
    "chest-discomfort": chestPressurePositive || chestDiscomfortPositive,
    palpitation:
      palpitationAction !== ACTION_OPTIONS[0] ||
      palpitationActionOther !== "" ||
      palpitationCourse !== COURSE_OPTIONS[0],
    jvd: jvdPositive || respSound !== "正常" || respSoundOther !== "",
    edema: edemaPositive || edemaUsual || diureticsHistory,
    "abdominal-pain":
      abPainPositive ||
      abPainRegion !== ABDOMINAL_REGION_OPTIONS[4] ||
      abPainQuality !== "" ||
      abTenderness ||
      abRebound ||
      abPainCourse !== COURSE_OPTIONS[0],
    "back-pain":
      backPainPositive ||
      backPainSite !== "" ||
      backPainQuality !== "" ||
      cvaTenderness ||
      dysuriaPain ||
      hematuriaPositive ||
      backAssociated !== "",
    "gi-nausea":
      giNauseaPositive ||
      giNauseaActionText !== "" ||
      giNauseaHeadache ||
      giNauseaDizziness ||
      giNauseaNumbness ||
      giNauseaOther !== "" ||
      giNauseaCourse !== COURSE_OPTIONS[0],
    "gi-vomit": giVomitPositive || giVomitCount !== "",
    diarrhea: diarrheaPositive || diarrheaCount !== "",
    hematemesis:
      hematemesisPositive ||
      hematemesisAmount !== "" ||
      hematemesisColor !== "鮮血" ||
      hematemesisCharacter !== "血液のみ",
    melena:
      melenaPositive ||
      melenaAmount !== "" ||
      melenaColor !== "鮮血" ||
      melenaCharacter !== "血液のみ",
    "abdominal-abnormal":
      abDistension ||
      abBulge ||
      abBulgeRegion !== ABDOMINAL_REGION_OPTIONS[4] ||
      boardLike,
    "face-head": faceHeadTrauma !== "" || faceHeadNormal,
    neck: neckTrauma !== "" || neckNormal,
    trunk: trunkTrauma !== "" || trunkNormal,
    pelvis: pelvisTrauma !== "" || pelvisNormal,
    "upper-limb": upperLimbTrauma !== "" || upperLimbNormal,
    "lower-limb": lowerLimbTrauma !== "" || lowerLimbNormal,
  };

  const findingMajorChanged: Record<string, boolean> = Object.fromEntries(
    FINDING_SECTIONS.map((major) => [
      major.id,
      major.items.some((middle) => findingMiddleChanged[middle.id]),
    ]),
  );

  const asSummaryValue = (value: unknown) => {
    if (value === null || value === undefined) return "未入力";
    if (typeof value === "string") return value.trim() ? value : "未入力";
    return String(value);
  };

  const birthSummary =
    birthType === "western"
      ? asSummaryValue(birthDateWestern)
      : `${birthEra === "reiwa" ? "令和" : birthEra === "heisei" ? "平成" : "昭和"} ${asSummaryValue(
          birthEraYear,
        )}年 ${asSummaryValue(birthMonth)}月 ${asSummaryValue(birthDay)}日`;

  const changedMiddleList = FINDING_SECTIONS.flatMap((major) =>
    major.items
      .filter((middle) => findingMiddleChanged[middle.id])
      .map((middle) => ({ major: major.label, middle: middle.label, id: middle.id })),
  );

  useEffect(() => {
    if (activeTab !== "history") return;
    const readHistory = async () => {
      try {
        const res = await fetch(`/api/cases/send-history?caseId=${encodeURIComponent(caseId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { rows?: SendHistoryItem[] };
        if (Array.isArray(data.rows)) {
          setSendHistory(data.rows);
        }
      } catch {
        // ignore fetch failures
      }
    };
    void readHistory();
  }, [activeTab, caseId]);

  const handleTransportDecision = async (
    targetId: number,
    status: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED",
    reason?: TransportDecisionPayload,
  ) => {
    const key = String(targetId);
    if (!targetId || !caseId || decisionPendingByRequest[key]) return false;
    setDecisionPendingByRequest((prev) => ({ ...prev, [key]: true }));
    try {
      const data = await updateTransportDecision(targetId, {
        caseId,
        action: "DECIDE",
        status,
        reasonCode: reason?.reasonCode,
        reasonText: reason?.reasonText,
      });
      const nextStatus = data.statusLabel ?? (status === "TRANSPORT_DECIDED" ? "搬送決定" : "辞退");
      setSendHistory((prev) =>
        prev.map((item) =>
          item.targetId === targetId
            ? {
                ...item,
                status: nextStatus as SendHistoryItem["status"],
                canDecide: false,
              }
            : item,
        ),
      );
      return true;
    } catch {
      // ignore update failures
      return false;
    } finally {
      setDecisionPendingByRequest((prev) => ({ ...prev, [key]: false }));
    }
  };

  const resetTransportDeclineReasonState = () => {
    setTransportDeclineReasonCode("");
    setTransportDeclineReasonText("");
    setTransportDeclineReasonError("");
  };

  const closeTransportDeclineDialog = () => {
    if (consultSending || (decisionConfirm && decisionPendingByRequest[String(decisionConfirm.targetId)])) return;
    setConsultDecisionConfirm((current) => (current === "TRANSPORT_DECLINED" ? null : current));
    setDecisionConfirm((current) => (current?.action === "TRANSPORT_DECLINED" ? null : current));
    resetTransportDeclineReasonState();
  };

  const confirmTransportDecline = async () => {
    const payload = {
      reasonCode: transportDeclineReasonCode || undefined,
      reasonText: transportDeclineReasonText || undefined,
    };
    if (consultDecisionConfirm === "TRANSPORT_DECLINED" && consultTarget?.targetId) {
      setConsultSending(true);
      setConsultError("");
      try {
        const ok = await handleTransportDecision(consultTarget.targetId, "TRANSPORT_DECLINED", payload);
        if (!ok) throw new Error("搬送判断の送信に失敗しました。");
        resetTransportDeclineReasonState();
        setConsultDecisionConfirm(null);
        closeConsultModal();
      } catch (error) {
        setTransportDeclineReasonError(error instanceof Error ? error.message : "搬送辞退の送信に失敗しました。");
      } finally {
        setConsultSending(false);
      }
      return;
    }
    if (!decisionConfirm || decisionConfirm.action !== "TRANSPORT_DECLINED") return;
    const key = String(decisionConfirm.targetId);
    if (decisionPendingByRequest[key]) return;
    const ok = await handleTransportDecision(decisionConfirm.targetId, "TRANSPORT_DECLINED", payload);
    if (ok) {
      setDecisionConfirm(null);
      resetTransportDeclineReasonState();
      return;
    }
    setTransportDeclineReasonError("搬送辞退の送信に失敗しました。");
  };

  const confirmTransportDecision = async () => {
    if (!decisionConfirm) return;
    const ok = await handleTransportDecision(decisionConfirm.targetId, decisionConfirm.action);
    if (ok) {
      setDecisionConfirm(null);
    }
  };

  const fetchConsultMessages = async (targetId: number) => {
    setConsultLoading(true);
    setConsultError("");
    try {
      const data = await fetchCaseConsultDetail<never, ConsultMessage>(targetId);
      setConsultMessages(data.messages);
    } catch (error) {
      setConsultMessages([]);
      setConsultError(error instanceof Error ? error.message : "相談履歴の取得に失敗しました。");
    } finally {
      setConsultLoading(false);
    }
  };

  const openConsultModal = async (item: SendHistoryItem) => {
    if (!item.targetId) return;
    setConsultTarget(item);
    setConsultModalOpen(true);
    setConsultNote("");
    setConsultMessages([]);
    setConsultDecisionConfirm(null);
    await fetchConsultMessages(item.targetId);
  };

  const closeConsultModal = () => {
    if (consultSending) return;
    setConsultModalOpen(false);
    setConsultTarget(null);
    setConsultMessages([]);
    setConsultError("");
    setConsultNote("");
    setConsultDecisionConfirm(null);
    resetTransportDeclineReasonState();
  };

  const sendConsultReply = async () => {
    if (!consultTarget?.targetId || !consultNote.trim() || consultSending) return;
    setConsultSending(true);
    setConsultError("");
    try {
      await sendCaseConsultReply(consultTarget.targetId, consultNote.trim());
      setConsultNote("");
      await fetchConsultMessages(consultTarget.targetId);
    } catch (error) {
      setConsultError(error instanceof Error ? error.message : "相談コメント送信に失敗しました。");
    } finally {
      setConsultSending(false);
    }
  };

  const sendDecisionFromConsult = async (status: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => {
    if (!consultTarget?.targetId || consultSending) return;
    if (status === "TRANSPORT_DECLINED") {
      await confirmTransportDecline();
      return;
    }

    setConsultSending(true);
    setConsultError("");
    try {
      const ok = await handleTransportDecision(consultTarget.targetId, status);
      if (!ok) throw new Error("???????????????");
      setConsultDecisionConfirm(null);
      closeConsultModal();
    } catch (error) {
      setConsultError(error instanceof Error ? error.message : "???????????????");
    } finally {
      setConsultSending(false);
    }
  };

  const renderNeuroMiddleBody = (middleId: string) =>
    renderNeuroFindingBody(
      middleId,
      {
        headachePositive: { value: headachePositive, onChange: setHeadachePositive },
        headacheQuality: { value: headacheQuality, onChange: setHeadacheQuality },
        headacheAction: { value: headacheAction, onChange: setHeadacheAction },
        headacheActionOther: { value: headacheActionOther, onChange: setHeadacheActionOther },
        headacheCourse: { value: headacheCourse, onChange: setHeadacheCourse },
        headacheOther: { value: headacheOther, onChange: setHeadacheOther },
        nauseaPositive: { value: nauseaPositive, onChange: setNauseaPositive },
        nauseaCourse: { value: nauseaCourse, onChange: setNauseaCourse },
        nauseaOther: { value: nauseaOther, onChange: setNauseaOther },
        vomitPositive: { value: vomitPositive, onChange: setVomitPositive },
        vomitQuality: { value: vomitQuality, onChange: setVomitQuality },
        vomitCountMode: { value: vomitCountMode, onChange: setVomitCountMode },
        vomitCountConfirmed: { value: vomitCountConfirmed, onChange: setVomitCountConfirmed },
        vomitCountMin: { value: vomitCountMin, onChange: setVomitCountMin },
        vomitCountMax: { value: vomitCountMax, onChange: setVomitCountMax },
        vomitOther: { value: vomitOther, onChange: setVomitOther },
        dizzinessPositive: { value: dizzinessPositive, onChange: setDizzinessPositive },
        dizzinessType: { value: dizzinessType, onChange: setDizzinessType },
        dizzinessAction: { value: dizzinessAction, onChange: setDizzinessAction },
        dizzinessActionOther: { value: dizzinessActionOther, onChange: setDizzinessActionOther },
        dizzinessCourse: { value: dizzinessCourse, onChange: setDizzinessCourse },
        dizzinessPast: { value: dizzinessPast, onChange: setDizzinessPast },
        dizzinessPastWhen: { value: dizzinessPastWhen, onChange: setDizzinessPastWhen },
        tinnitusPositive: { value: tinnitusPositive, onChange: setTinnitusPositive },
        earFullnessPositive: { value: earFullnessPositive, onChange: setEarFullnessPositive },
        numbnessPositive: { value: numbnessPositive, onChange: setNumbnessPositive },
        numbnessSite: { value: numbnessSite, onChange: setNumbnessSite },
        paralysisOnsetDate: { value: paralysisOnsetDate, onChange: setParalysisOnsetDate },
        paralysisOnsetTime: { value: paralysisOnsetTime, onChange: setParalysisOnsetTime },
        paralysisAction: { value: paralysisAction, onChange: setParalysisAction },
        paralysisActionOther: { value: paralysisActionOther, onChange: setParalysisActionOther },
        paralysisLastKnownDate: { value: paralysisLastKnownDate, onChange: setParalysisLastKnownDate },
        paralysisLastKnownTime: { value: paralysisLastKnownTime, onChange: setParalysisLastKnownTime },
        paralysisSite: { value: paralysisSite, onChange: setParalysisSite },
        paralysisGaze: { value: paralysisGaze, onChange: setParalysisGaze },
      },
      { actionOptions: ACTION_OPTIONS, courseOptions: COURSE_OPTIONS },
    );

  const renderCardioMiddleBody = (middleId: string) =>
    renderCardioFindingBody(
      middleId,
      {
        chestPainPositive: { value: chestPainPositive, onChange: setChestPainPositive },
        chestPainAction: { value: chestPainAction, onChange: setChestPainAction },
        chestPainActionOther: { value: chestPainActionOther, onChange: setChestPainActionOther },
        chestPainLocation: { value: chestPainLocation, onChange: setChestPainLocation },
        chestPainQuality: { value: chestPainQuality, onChange: setChestPainQuality },
        chestPainRadiation: { value: chestPainRadiation, onChange: setChestPainRadiation },
        chestPainRadiationCourse: { value: chestPainRadiationCourse, onChange: setChestPainRadiationCourse },
        chestPainNrs: { value: chestPainNrs, onChange: setChestPainNrs },
        coldSweatPositive: { value: coldSweatPositive, onChange: setColdSweatPositive },
        facialPallorPositive: { value: facialPallorPositive, onChange: setFacialPallorPositive },
        chestPressurePositive: { value: chestPressurePositive, onChange: setChestPressurePositive },
        chestDiscomfortPositive: { value: chestDiscomfortPositive, onChange: setChestDiscomfortPositive },
        palpitationAction: { value: palpitationAction, onChange: setPalpitationAction },
        palpitationActionOther: { value: palpitationActionOther, onChange: setPalpitationActionOther },
        palpitationCourse: { value: palpitationCourse, onChange: setPalpitationCourse },
        jvdPositive: { value: jvdPositive, onChange: setJvdPositive },
        respSound: { value: respSound, onChange: setRespSound },
        respSoundOther: { value: respSoundOther, onChange: setRespSoundOther },
        edemaPositive: { value: edemaPositive, onChange: setEdemaPositive },
        edemaUsual: { value: edemaUsual, onChange: setEdemaUsual },
        diureticsHistory: { value: diureticsHistory, onChange: setDiureticsHistory },
      },
      { actionOptions: ACTION_OPTIONS, courseOptions: COURSE_OPTIONS },
    );

  const renderDigestiveMiddleBody = (middleId: string) =>
    renderDigestiveFindingBody(
      middleId,
      {
        abPainPositive: { value: abPainPositive, onChange: setAbPainPositive },
        abPainRegion: { value: abPainRegion, onChange: setAbPainRegion },
        abPainQuality: { value: abPainQuality, onChange: setAbPainQuality },
        abTenderness: { value: abTenderness, onChange: setAbTenderness },
        abRebound: { value: abRebound, onChange: setAbRebound },
        abPainCourse: { value: abPainCourse, onChange: setAbPainCourse },
        backPainPositive: { value: backPainPositive, onChange: setBackPainPositive },
        backPainSite: { value: backPainSite, onChange: setBackPainSite },
        backPainQuality: { value: backPainQuality, onChange: setBackPainQuality },
        cvaTenderness: { value: cvaTenderness, onChange: setCvaTenderness },
        dysuriaPain: { value: dysuriaPain, onChange: setDysuriaPain },
        hematuriaPositive: { value: hematuriaPositive, onChange: setHematuriaPositive },
        backAssociated: { value: backAssociated, onChange: setBackAssociated },
        giNauseaPositive: { value: giNauseaPositive, onChange: setGiNauseaPositive },
        giNauseaActionText: { value: giNauseaActionText, onChange: setGiNauseaActionText },
        giNauseaHeadache: { value: giNauseaHeadache, onChange: setGiNauseaHeadache },
        giNauseaDizziness: { value: giNauseaDizziness, onChange: setGiNauseaDizziness },
        giNauseaNumbness: { value: giNauseaNumbness, onChange: setGiNauseaNumbness },
        giNauseaOther: { value: giNauseaOther, onChange: setGiNauseaOther },
        giNauseaCourse: { value: giNauseaCourse, onChange: setGiNauseaCourse },
        giVomitPositive: { value: giVomitPositive, onChange: setGiVomitPositive },
        giVomitCount: { value: giVomitCount, onChange: setGiVomitCount },
        diarrheaPositive: { value: diarrheaPositive, onChange: setDiarrheaPositive },
        diarrheaCount: { value: diarrheaCount, onChange: setDiarrheaCount },
        hematemesisPositive: { value: hematemesisPositive, onChange: setHematemesisPositive },
        hematemesisAmount: { value: hematemesisAmount, onChange: setHematemesisAmount },
        hematemesisColor: { value: hematemesisColor, onChange: setHematemesisColor },
        hematemesisCharacter: { value: hematemesisCharacter, onChange: setHematemesisCharacter },
        melenaPositive: { value: melenaPositive, onChange: setMelenaPositive },
        melenaAmount: { value: melenaAmount, onChange: setMelenaAmount },
        melenaColor: { value: melenaColor, onChange: setMelenaColor },
        melenaCharacter: { value: melenaCharacter, onChange: setMelenaCharacter },
        abDistension: { value: abDistension, onChange: setAbDistension },
        abBulge: { value: abBulge, onChange: setAbBulge },
        abBulgeRegion: { value: abBulgeRegion, onChange: setAbBulgeRegion },
        boardLike: { value: boardLike, onChange: setBoardLike },
      },
      {
        abdominalRegionOptions: ABDOMINAL_REGION_OPTIONS,
        courseOptions: COURSE_OPTIONS,
      },
    );

  const renderTraumaMiddleBody = (middleId: string) =>
    renderTraumaFindingSection(middleId, {
      faceHead: {
        value: faceHeadTrauma,
        normal: faceHeadNormal,
        setValue: setFaceHeadTrauma,
        setNormal: setFaceHeadNormal,
      },
      neck: {
        value: neckTrauma,
        normal: neckNormal,
        setValue: setNeckTrauma,
        setNormal: setNeckNormal,
      },
      trunk: {
        value: trunkTrauma,
        normal: trunkNormal,
        setValue: setTrunkTrauma,
        setNormal: setTrunkNormal,
      },
      pelvis: {
        value: pelvisTrauma,
        normal: pelvisNormal,
        setValue: setPelvisTrauma,
        setNormal: setPelvisNormal,
      },
      upperLimb: {
        value: upperLimbTrauma,
        normal: upperLimbNormal,
        setValue: setUpperLimbTrauma,
        setNormal: setUpperLimbNormal,
      },
      lowerLimb: {
        value: lowerLimbTrauma,
        normal: lowerLimbNormal,
        setValue: setLowerLimbTrauma,
        setNormal: setLowerLimbNormal,
      },
    });

  const findingPayload = {
    neuro: {
      headachePositive,
      headacheQuality,
      headacheAction,
      headacheActionOther,
      headacheCourse,
      headacheOther,
      nauseaPositive,
      nauseaCourse,
      nauseaOther,
      vomitPositive,
      vomitQuality,
      vomitCountMode,
      vomitCountConfirmed,
      vomitCountMin,
      vomitCountMax,
      vomitOther,
      dizzinessPositive,
      dizzinessType,
      dizzinessAction,
      dizzinessActionOther,
      dizzinessCourse,
      dizzinessPast,
      dizzinessPastWhen,
      tinnitusPositive,
      earFullnessPositive,
      numbnessPositive,
      numbnessSite,
      paralysisOnsetDate,
      paralysisOnsetTime,
      paralysisAction,
      paralysisActionOther,
      paralysisLastKnownDate,
      paralysisLastKnownTime,
      paralysisSite,
      paralysisGaze,
    },
    cardio: {
      chestPainPositive,
      chestPainAction,
      chestPainActionOther,
      chestPainLocation,
      chestPainQuality,
      chestPainRadiation,
      chestPainRadiationCourse,
      chestPainNrs,
      coldSweatPositive,
      facialPallorPositive,
      chestPressurePositive,
      chestDiscomfortPositive,
      palpitationAction,
      palpitationActionOther,
      palpitationCourse,
      jvdPositive,
      respSound,
      respSoundOther,
      edemaPositive,
      edemaUsual,
      diureticsHistory,
    },
    digestive: {
      abPainPositive,
      abPainRegion,
      abPainQuality,
      abTenderness,
      abRebound,
      abPainCourse,
      backPainPositive,
      backPainSite,
      backPainQuality,
      cvaTenderness,
      dysuriaPain,
      hematuriaPositive,
      backAssociated,
      giNauseaPositive,
      giNauseaActionText,
      giNauseaHeadache,
      giNauseaDizziness,
      giNauseaNumbness,
      giNauseaOther,
      giNauseaCourse,
      giVomitPositive,
      giVomitCount,
      diarrheaPositive,
      diarrheaCount,
      hematemesisPositive,
      hematemesisAmount,
      hematemesisColor,
      hematemesisCharacter,
      melenaPositive,
      melenaAmount,
      melenaColor,
      melenaCharacter,
      abDistension,
      abBulge,
      abBulgeRegion,
      boardLike,
    },
    trauma: {
      faceHeadTrauma,
      faceHeadNormal,
      neckTrauma,
      neckNormal,
      trunkTrauma,
      trunkNormal,
      pelvisTrauma,
      pelvisNormal,
      upperLimbTrauma,
      upperLimbNormal,
      lowerLimbTrauma,
      lowerLimbNormal,
    },
  };
  const changedDetailMap = createChangedDetailMap(findingPayload, asSummaryValue);
  const summaryData = buildCaseSummaryData({
    caseId,
    nameUnknown,
    name,
    gender,
    birthSummary,
    age,
    address,
    phone,
    adl,
    allergy,
    dnarSummary,
    weight,
    relatedPeople,
    pastHistories,
    vitals,
    findingSections: FINDING_SECTIONS,
    findingMiddleChanged,
    changedMiddleList,
    changedDetailMap,
    asSummaryValue,
  });

  const buildCasePayload = () => {
    return {
      caseId,
      division: initialCase?.division ?? "1部",
      awareDate: dispatchContext.awareDate,
      awareTime: dispatchContext.awareTime,
      patientName: nameUnknown ? "不明" : name || "不明",
      age: age ? Number(age) : initialCase?.age ?? 0,
      address: dispatchContext.dispatchAddress,
      symptom: chiefComplaint,
      destination: initialCase?.destination ?? null,
      note: dispatchSummary,
      casePayload: {
        mode,
        dispatch: {
          awareDate: dispatchContext.awareDate,
          awareTime: dispatchContext.awareTime,
          dispatchAddress: dispatchContext.dispatchAddress,
        },
        basic: {
          caseId,
          name,
          nameUnknown,
          teamCode: operatorCode ?? "",
          teamName: operatorName ?? "",
          gender,
          birthType,
          birthDateWestern,
          birthEra,
          birthEraYear,
          birthMonth,
          birthDay,
          calculatedAge: age,
          address,
          awareDate: dispatchContext.awareDate,
          awareTime: dispatchContext.awareTime,
          dispatchAddress: dispatchContext.dispatchAddress,
          phone,
          adl,
          dnarOption,
          dnarOther,
          allergy,
          weight,
          relatedPeople,
          pastHistories,
          specialNote,
        },
        summary: {
          dispatchSummary,
          chiefComplaint,
        },
        vitals,
        changedFindings: changedMiddleList.map((item) => ({
          major: item.major,
          middle: item.middle,
          detail: changedDetailMap[item.id] ?? "内容表示なし",
        })),
        findings: findingPayload,
        sendHistory,
      },
    };
  };

  const persistCase = async () => {
    const payload = buildCasePayload();
    return createCaseRecord<typeof payload, { caseId?: string }>(payload);
  };

  const validateAgeDependentRequired = (): string | null => {
    const ageValue = Number(age);
    if (!Number.isFinite(ageValue)) return null;

    const normalizedWeight = String(weight ?? "").trim();
    const normalizedAdl = String(adl ?? "").trim();

    if (ageValue < 12 && !normalizedWeight) {
      return "12歳未満は体重の入力が必須です。";
    }
    if (ageValue >= 75 && !normalizedAdl) {
      return "75歳以上はADLの入力が必須です。";
    }
    return null;
  };

  const handleSave = async () => {
    if (readOnly) return;
    const validationError = validateAgeDependentRequired();
    if (validationError) {
      setSaveState("error");
      setSaveMessage(validationError);
      return;
    }

    try {
      setSaveState("saving");
      setSaveMessage("");
      const data = await persistCase();

      setSaveState("saved");
      setSaveMessage(`保存完了: ${data.caseId ?? caseId}`);
    } catch (e) {
      setSaveState("error");
      setSaveMessage(e instanceof Error ? e.message : "保存に失敗しました。");
    }
  };

  const handleGoHospitalSelection = async () => {
    if (readOnly) return;
    const validationError = validateAgeDependentRequired();
    if (validationError) {
      setSaveState("error");
      setSaveMessage(validationError);
      return;
    }

    try {
      setSaveState("saving");
      setSaveMessage("");
      await persistCase();
      setSaveState("saved");
      setSaveMessage(`保存完了: ${caseId}`);
    } catch (e) {
      setSaveState("error");
      setSaveMessage(e instanceof Error ? e.message : "保存に失敗しました。");
      return;
    }

    const context = {
      caseId,
      awareDate: dispatchContext.awareDate,
      awareTime: dispatchContext.awareTime,
      dispatchAddress: dispatchContext.dispatchAddress,
      name: nameUnknown ? "不明" : name || "不明",
      age: age || "",
      address,
      phone,
      gender: gender === "male" ? "男性" : gender === "female" ? "女性" : "不明",
      birthSummary,
      adl,
      dnar: dnarSummary,
      allergy,
      weight,
      relatedPeople,
      pastHistories,
      specialNote,
      chiefComplaint,
      dispatchSummary,
      vitals,
      changedFindings: changedMiddleList.map((item) => ({
        major: item.major,
        middle: item.middle,
        detail: changedDetailMap[item.id] ?? "内容表示なし",
      })),
      updatedAt: new Date().toISOString(),
    };
    try {
      const key = `case-context:${caseId}`;
      sessionStorage.setItem(key, JSON.stringify(context));
      sessionStorage.setItem("active-case-context-key", key);
    } catch {
      // ignore storage failures
    }
    router.push(`/hospitals/search?caseId=${encodeURIComponent(caseId)}`);
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900" style={{ backgroundImage: "none" }}>
      <div className="flex h-full">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((v) => !v)}
          operatorName={operatorName}
          operatorCode={operatorCode}
        />

        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-5 lg:px-6">
          <div className="w-full min-w-0">
            <div className="sticky top-0 z-30 bg-[var(--dashboard-bg)] pb-3">
              <header className="mb-3 flex items-end justify-between pt-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">CASE MANAGEMENT</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {mode === "create" ? "事案情報作成" : "事案情報"}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  {mode === "edit" ? (
                    <Link href="/cases/search" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                      一覧へ戻る
                    </Link>
                  ) : null}
                  <Link href="/" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                    ホームへ戻る
                  </Link>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={readOnly || saveState === "saving"}
                    className="inline-flex items-center rounded-xl bg-[var(--accent-blue)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {readOnly ? "閲覧専用" : saveState === "saving" ? "保存中..." : "保存"}
                  </button>
                </div>
              </header>
              {saveMessage ? (
                <div
                  className={`mb-3 rounded-xl border px-4 py-2 text-xs font-semibold ${
                    saveState === "saved"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {saveMessage}
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex gap-2">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              {readOnly ? null : (
                <button
                  type="button"
                  onClick={handleGoHospitalSelection}
                  className="inline-flex min-w-[136px] items-center justify-center rounded-xl bg-[var(--accent-blue)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"
                >
                  病院選定へ
                </button>
              )}
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs font-semibold text-slate-500">覚知情報</p>
              <div className="grid grid-cols-12 gap-3">
                <label className="col-span-3">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">覚知日付</span>
                  <input
                    type="date"
                    value={dispatchContext.awareDate}
                    onChange={(e) => setDispatchContext((prev) => ({ ...prev, awareDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">覚知時間</span>
                  <input
                    type="time"
                    value={dispatchContext.awareTime}
                    onChange={(e) => setDispatchContext((prev) => ({ ...prev, awareTime: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="col-span-7">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">指令先住所</span>
                  <input
                    value={dispatchContext.dispatchAddress}
                    onChange={(e) => setDispatchContext((prev) => ({ ...prev, dispatchAddress: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
            </div>

            {activeTab === "basic" ? (
              <CaseFormBasicTab
                name={name}
                nameUnknown={nameUnknown}
                setName={setName}
                setNameUnknown={setNameUnknown}
                gender={gender}
                setGender={setGender}
                birthType={birthType}
                setBirthType={setBirthType}
                birthWesternYear={birthWesternYear}
                setBirthWesternYear={setBirthWesternYear}
                birthWesternMonth={birthWesternMonth}
                setBirthWesternMonth={setBirthWesternMonth}
                birthWesternDay={birthWesternDay}
                setBirthWesternDay={setBirthWesternDay}
                setBirthDateWestern={setBirthDateWestern}
                birthEra={birthEra}
                setBirthEra={setBirthEra}
                birthEraYear={birthEraYear}
                setBirthEraYear={setBirthEraYear}
                birthMonth={birthMonth}
                setBirthMonth={setBirthMonth}
                birthDay={birthDay}
                setBirthDay={setBirthDay}
                westernMonthRef={westernMonthRef}
                westernDayRef={westernDayRef}
                age={age}
                address={address}
                setAddress={setAddress}
                phone={phone}
                setPhone={setPhone}
                formatPhone={formatPhone}
                adl={adl}
                setAdl={setAdl}
                adlOptions={ADL_OPTIONS}
                dnarOption={dnarOption}
                setDnarOption={setDnarOption}
                dnarOther={dnarOther}
                setDnarOther={setDnarOther}
                allergy={allergy}
                setAllergy={setAllergy}
                weight={weight}
                setWeight={setWeight}
                relatedPeople={relatedPeople}
                setRelatedPeople={setRelatedPeople}
                pastHistories={pastHistories}
                renderPastHistoryRow={(entry, idx) => (
                  <PastHistoryRow
                    key={`history-${idx}`}
                    index={idx}
                    value={entry}
                    onChange={(next) => setPastHistories((prev) => prev.map((item, i) => (i === idx ? next : item)))}
                  />
                )}
                specialNote={specialNote}
                setSpecialNote={setSpecialNote}
              />
            ) : null}

            {activeTab === "vitals" ? (
              <CaseFormVitalsTab
                dispatchSummary={dispatchSummary}
                chiefComplaint={chiefComplaint}
                setDispatchSummary={setDispatchSummary}
                setChiefComplaint={setChiefComplaint}
                vitals={vitals}
                activeVitalIndex={activeVitalIndex}
                setActiveVitalIndex={setActiveVitalIndex}
                activeVital={activeVital}
                addVitalFromCurrent={addVitalFromCurrent}
                updateVital={updateVital}
                consciousnessActive={consciousnessActive}
                gcsParts={gcsParts}
                composeGcsValue={composeGcsValue}
                jcsOptions={JCS_OPTIONS}
                gcsEOptions={GCS_E_OPTIONS}
                gcsVOptions={GCS_V_OPTIONS}
                gcsMOptions={GCS_M_OPTIONS}
                respiratoryPatterns={RESPIRATORY_PATTERNS}
                breathOdors={BREATH_ODORS}
                ecgOptions={ECG_OPTIONS}
                lightReflexOptions={LIGHT_REFLEX_OPTIONS}
                gazeOptions={GAZE_OPTIONS}
                formatPupilInput={formatPupilInput}
                formatTemperatureInput={formatTemperatureInput}
                findings={FINDING_SECTIONS}
                openMajorIds={openMajorIds}
                openMiddleIds={openMiddleIds}
                findingMajorChanged={findingMajorChanged}
                findingMiddleChanged={findingMiddleChanged}
                toggleMajor={toggleMajor}
                toggleMiddle={toggleMiddle}
                renderFindingBody={(majorId, middleId, children) =>
                  majorId === "neuro"
                    ? renderNeuroMiddleBody(middleId)
                    : majorId === "cardio"
                      ? renderCardioMiddleBody(middleId)
                      : majorId === "digestive"
                        ? renderDigestiveMiddleBody(middleId)
                        : majorId === "trauma"
                          ? renderTraumaMiddleBody(middleId)
                          : (
                              <div className="grid grid-cols-2 gap-2">
                                {children.map((small, idx) => (
                                  <div key={`${majorId}:${middleId}:${idx}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                    {small}
                                  </div>
                                ))}
                              </div>
                            )
                }
              />
            ) : null}

            {activeTab === "summary" ? (
              <CaseFormSummaryTab
                headerText="基本情報・要請概要・バイタル・変更所見を一画面で確認します。"
                basicFields={summaryData.basicFields}
                relatedPeople={summaryData.relatedPeople}
                pastHistories={summaryData.pastHistories}
                specialNote={asSummaryValue(specialNote)}
                dispatchSummary={asSummaryValue(dispatchSummary)}
                chiefComplaint={asSummaryValue(chiefComplaint)}
                latestVitalTitle={summaryData.latestVitalTitle}
                latestVitalLine={summaryData.latestVitalLine}
                vitalCards={summaryData.vitalCards}
                changedFindings={summaryData.changedFindings}
                changedFindingDetails={summaryData.changedFindingDetails}
              />
            ) : null}

            {activeTab === "history" ? (
              <CaseSendHistoryTable
                readOnly={readOnly}
                sendHistory={sendHistory}
                decisionPendingByRequest={decisionPendingByRequest}
                onSelectDecision={setDecisionConfirm}
                onOpenConsult={(item) => void openConsultModal(item)}
              />
            ) : null}
          </div>
        </main>
      </div>
      <ConsultChatModal
        open={consultModalOpen}
        title={consultTarget?.hospitalName ?? "相談チャット"}
        subtitle={consultTarget ? `${caseId} / ${consultTarget.requestId}` : undefined}
        status={consultTarget?.status}
        messages={consultMessages}
        loading={consultLoading}
        error={consultError}
        note={consultNote}
        noteLabel="A側コメント"
        notePlaceholder="HP側へ送る相談回答を入力してください"
        sending={consultSending}
        canSend={!readOnly && Boolean(consultNote.trim())}
        onClose={closeConsultModal}
        onChangeNote={setConsultNote}
        onSend={() => void sendConsultReply()}
        topActions={
          readOnly ? null : (
            <>
              <button
                type="button"
                disabled={consultSending || !consultTarget?.canDecide}
                onClick={() => setConsultDecisionConfirm("TRANSPORT_DECIDED")}
                className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                搬送決定
              </button>
              <button
                type="button"
                disabled={consultSending || !consultTarget?.targetId}
                onClick={() => setConsultDecisionConfirm("TRANSPORT_DECLINED")}
                className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                搬送辞退
              </button>
            </>
          )
        }
        confirmSection={
          consultDecisionConfirm === "TRANSPORT_DECIDED" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">
                {consultDecisionConfirm === "TRANSPORT_DECIDED" ? "搬送決定を送信しますか？" : "搬送辞退を送信しますか？"}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={consultSending}
                  onClick={() => setConsultDecisionConfirm(null)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={consultSending}
                  onClick={() => void sendDecisionFromConsult(consultDecisionConfirm)}
                  className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {consultSending ? "送信中..." : "OK"}
                </button>
              </div>
            </div>
          ) : null
        }
      />
      <DecisionReasonDialog
        open={consultDecisionConfirm === "TRANSPORT_DECLINED" || decisionConfirm?.action === "TRANSPORT_DECLINED"}
        title="?????????"
        description="???????????????????"
        options={TRANSPORT_DECLINED_REASON_OPTIONS}
        value={transportDeclineReasonCode}
        textValue={transportDeclineReasonText}
        error={transportDeclineReasonError}
        sending={consultSending || Boolean(decisionConfirm && decisionPendingByRequest[String(decisionConfirm.targetId)])}
        confirmLabel="???????"
        onClose={closeTransportDeclineDialog}
        onChangeValue={setTransportDeclineReasonCode}
        onChangeText={setTransportDeclineReasonText}
        onConfirm={() => void confirmTransportDecline()}
      />
      {decisionConfirm && decisionConfirm.action === "TRANSPORT_DECIDED" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CONFIRM</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">????????????</h3>
            <p className="mt-2 text-sm text-slate-600">???????????????????</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisionConfirm(null)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                ?????
              </button>
              <button
                type="button"
                disabled={Boolean(decisionPendingByRequest[String(decisionConfirm.targetId)])}
                onClick={() => void confirmTransportDecision()}
                className="inline-flex h-10 items-center rounded-xl bg-[var(--accent-blue)] px-4 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {decisionPendingByRequest[String(decisionConfirm.targetId)] ? "???..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
