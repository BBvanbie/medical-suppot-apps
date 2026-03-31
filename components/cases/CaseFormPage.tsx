"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CaseFormSummaryTab } from "@/components/cases/CaseFormSummaryTab";

import { CaseFindingsV2Panel } from "@/components/cases/CaseFindingsV2Panel";

import { CaseFormBasicTab } from "@/components/cases/CaseFormBasicTab";

import { buildCaseSummaryData } from "@/components/cases/CaseFormSummaryData";

import { CaseFormVitalsTab } from "@/components/cases/CaseFormVitalsTab";

import { CaseSendHistoryTable } from "@/components/cases/CaseSendHistoryTable";

import { useEmsDisplayProfile } from "@/components/ems/useEmsDisplayProfile";

import { Sidebar } from "@/components/home/Sidebar";

import { OfflineProvider } from "@/components/offline/OfflineProvider";

import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";

import { useOfflineState } from "@/components/offline/useOfflineState";

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

import { CASE_FINDING_SECTIONS_V2, createEmptyCaseFindings } from "@/lib/caseFindingsConfig";

import { normalizeCaseFindings } from "@/lib/caseFindingsNormalizer";

import type { CaseFindings, FindingDetailValue, FindingState } from "@/lib/caseFindingsSchema";

import { buildChangedFindingsSummary } from "@/lib/caseFindingsSummary";
import { extractAsciiDigits, normalizeAsciiNumberText } from "@/lib/inputDigits";

import { enqueueConsultReply, listOfflineConsultMessages } from "@/lib/offline/offlineConsultQueue";

import { enqueueCaseUpdate } from "@/lib/offline/offlineCaseQueue";

import { deleteOfflineCaseDraft, generateOfflineCaseId, getOfflineCaseDraft, saveOfflineCaseDraft } from "@/lib/offline/offlineCaseDrafts";

import type { CaseRecord } from "@/lib/mockCases";

type CaseFormPageProps = {

  mode: "create" | "edit";

  initialCase?: CaseRecord;

  initialPayload?: unknown;

  operatorName?: string;

  operatorCode?: string;

  readOnly?: boolean;

};

type CaseFormPageContentProps = CaseFormPageProps & {

  restoredDraftAt?: string | null;

  restoredLocalDraft?: boolean;

  restoredConflictDraft?: boolean;

};

type TabId = "basic" | "vitals" | "summary" | "history";

type BirthType = "western" | "japanese";

type Era = "reiwa" | "heisei" | "showa";

type Gender = "male" | "female" | "unknown";
type AgeMode = "auto" | "unknown" | "estimated";

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

type IncidentType =
  | "急病"
  | "交通事故"
  | "一般負傷"
  | "加害"
  | "自損行為"
  | "労働災害"
  | "運動競技"
  | "火災"
  | "水難事故"
  | "自然災害"
  | "転院搬送"
  | "その他";

type SendHistoryItem = {

  targetId: number;

  requestId: string;

  caseId: string;

  sentAt: string;

  status?: "\u672A\u8AAD" | "\u65E2\u8AAD" | "\u8981\u76F8\u8AC7" | "\u53D7\u5165\u53EF\u80FD" | "\u53D7\u5165\u4E0D\u53EF" | "\u642C\u9001\u6C7A\u5B9A" | "\u642C\u9001\u8F9E\u9000" | "\u8F9E\u9000";

  hospitalName?: string;

  selectedDepartments?: string[];

  canDecide?: boolean;

  canConsult?: boolean;

  consultComment?: string;

  emsReplyComment?: string;

};

type ConsultMessage = {

  id: number | string;

  actor: "A" | "HP";

  actedAt: string;

  note: string;

  localStatus?: "\u672A\u9001\u4FE1" | "\u9001\u4FE1\u5F85\u3061" | "\u7AF6\u5408" | "\u9001\u4FE1\u5931\u6557";

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
const INCIDENT_TYPE_OPTIONS: IncidentType[] = ["急病", "交通事故", "一般負傷", "加害", "自損行為", "労働災害", "運動競技", "火災", "水難事故", "自然災害", "転院搬送", "その他"];

function formatPhone(input: string) {

  const digits = extractAsciiDigits(input, 11);

  if (digits.length <= 3) return digits;

  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;

}

function parseWesternDateParts(value: string): { year: string; month: string; day: string } {

  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!m) return { year: "", month: "", day: "" };

  return { year: m[1], month: m[2], day: m[3] };

}

function composeWesternDate(year: string, month: string, day: string) {

  if (!year || !month || !day) return "";

  const normalizedYear = extractAsciiDigits(year, 4);

  const normalizedMonth = extractAsciiDigits(month, 2);

  const normalizedDay = extractAsciiDigits(day, 2);

  if (normalizedYear.length !== 4 || normalizedMonth.length < 1 || normalizedDay.length < 1) return "";

  const paddedMonth = normalizedMonth.padStart(2, "0");

  const paddedDay = normalizedDay.padStart(2, "0");

  const candidate = new Date(Number(normalizedYear), Number(paddedMonth) - 1, Number(paddedDay));

  if (

    Number.isNaN(candidate.getTime()) ||

    candidate.getFullYear() !== Number(normalizedYear) ||

    candidate.getMonth() !== Number(paddedMonth) - 1 ||

    candidate.getDate() !== Number(paddedDay)

  ) {

    return "";

  }

  return `${normalizedYear}-${paddedMonth}-${paddedDay}`;

}

function formatPupilInput(raw: string): string {

  const digits = extractAsciiDigits(raw, 2);

  if (digits.length <= 1) return digits;

  return `${digits[0]}.${digits[1]}`;

}

function formatTemperatureInput(raw: string): string {

  const digits = extractAsciiDigits(raw, 3);

  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}.${digits[2]}`;

}

function formatWeightInput(raw: string) {

  const normalized = normalizeAsciiNumberText(raw).replace(/[^0-9.]/g, "");

  const [integerPart = "", ...fractionParts] = normalized.split(".");

  const safeInteger = integerPart.slice(0, 3);

  if (fractionParts.length === 0) {

    return safeInteger;

  }

  return `${safeInteger}.${fractionParts.join("").slice(0, 1)}`;

}

function calcAge(d: Date | null) {

  if (!d) return "";

  const now = new Date();

  let age = now.getFullYear() - d.getFullYear();

  const monthDiff = now.getMonth() - d.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age -= 1;

  return age >= 0 ? String(age) : "";

}

function toDate(

  era: Era,

  eraYear: string,

  month: string,

  day: string,

  western: string,

  type: BirthType,

  westernYear?: string,

  westernMonth?: string,

  westernDay?: string,

) {

  if (type === "western") {

    const resolvedWestern = western || composeWesternDate(westernYear ?? "", westernMonth ?? "", westernDay ?? "");

    if (!resolvedWestern) return null;

    const d = new Date(resolvedWestern);

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

const FINDINGS_V2_SHARED_STATE_GROUPS: readonly (readonly string[])[] = [];

function syncFindingsV2SharedState(findings: CaseFindings, sourceKey: string, state: FindingState) {

  for (const group of FINDINGS_V2_SHARED_STATE_GROUPS) {

    if (!(group as readonly string[]).includes(sourceKey)) continue;

    for (const key of group) {

      if (key === sourceKey) continue;

      const [sectionAndItem, detailId] = key.split("#");

      const [sectionId, itemId] = sectionAndItem.split(":");

      const target = findings[sectionId]?.[itemId];

      if (!target) continue;

      if (detailId) {

        if (detailId in target.details) {

          target.details[detailId] = state;

        }

        continue;

      }

      target.state = state;

      if (state !== "positive") {

        const fallback = createEmptyCaseFindings()[sectionId]?.[itemId];

        if (fallback) {

          target.details = fallback.details;

        }

      }

    }

    break;

  }

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

    <div className="rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-200/70">

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

            <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-lg bg-white ring-1 ring-slate-200/90">

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

export function CaseFormPage(props: CaseFormPageProps) {

  const [resolvedInitialPayload, setResolvedInitialPayload] = useState(props.initialPayload);

  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);

  const [restoredLocalDraft, setRestoredLocalDraft] = useState(false);

  const [restoredConflictDraft, setRestoredConflictDraft] = useState(false);

  const [isDraftReady, setIsDraftReady] = useState(false);

  useEffect(() => {

    let cancelled = false;

    const loadDraft = async () => {

      try {

        const draft =

          props.mode === "edit" && props.initialCase?.caseId

            ? await getOfflineCaseDraft(props.initialCase.caseId)

            : null;

        if (cancelled) return;

        if (draft?.payload) {

          setResolvedInitialPayload(draft.payload);

          setRestoredDraftAt(draft.updatedAt);

          setRestoredLocalDraft(props.mode === "edit" && draft.serverCaseId === props.initialCase?.caseId && draft.syncStatus !== "synced");

          setRestoredConflictDraft(draft.syncStatus === "conflict");

        } else {

          setRestoredLocalDraft(false);

          setRestoredConflictDraft(false);

        }

      } finally {

        if (!cancelled) {

          setIsDraftReady(true);

        }

      }

    };

    void loadDraft();

    return () => {

      cancelled = true;

    };

  }, [props.initialCase?.caseId, props.mode]);

  return (

    <OfflineProvider>

      {isDraftReady ? (

        <CaseFormPageContent {...props} initialPayload={resolvedInitialPayload} restoredDraftAt={restoredDraftAt} restoredLocalDraft={restoredLocalDraft} restoredConflictDraft={restoredConflictDraft} />

      ) : (

        <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">

          <div className="flex h-full items-center justify-center">

            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">{"下書きを読み込み中..."}</div>

          </div>

        </div>

      )}

    </OfflineProvider>

  );

}

function CaseFormPageContent({ mode, initialCase, initialPayload, operatorName, operatorCode, readOnly = false, restoredDraftAt = null, restoredLocalDraft = false, restoredConflictDraft = false }: CaseFormPageContentProps) {

  const router = useRouter();

  const { isOffline } = useOfflineState();

  const isOfflineRestricted = isOffline;

  const offlineDecisionReason = "この操作はオンライン時のみ実行できます";

  const initial = (initialPayload ?? {}) as Record<string, unknown>;

  const initialBasic = (initial.basic ?? {}) as Record<string, unknown>;

  const initialSummary = (initial.summary ?? {}) as Record<string, unknown>;

  const initialFindingsV2 = normalizeCaseFindings(initial.findingsV2 ?? initial.findings ?? {});

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

  const displayProfile = useEmsDisplayProfile();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const tabContentTopRef = useRef<HTMLDivElement | null>(null);
  const tabScrollInitializedRef = useRef(false);

  const [caseId] = useState((initialBasic.caseId as string) ?? initialCase?.caseId ?? (mode === "create" ? generateOfflineCaseId() : generateCaseId()));

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

  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(restoredDraftAt);

  const autoSaveSnapshotRef = useRef("");

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

  const [incidentType, setIncidentType] = useState<IncidentType | "">((initialSummary.incidentType as IncidentType) ?? "");
  const [ageMode, setAgeMode] = useState<AgeMode>(
    (initialBasic.ageMode as AgeMode) === "unknown" || (initialBasic.ageMode as AgeMode) === "estimated" || (initialBasic.ageMode as AgeMode) === "auto"
      ? (initialBasic.ageMode as AgeMode)
      : typeof initialBasic.estimatedAge === "string" && initialBasic.estimatedAge.trim()
        ? "estimated"
        : "auto",
  );
  const [estimatedAge, setEstimatedAge] = useState(
    extractAsciiDigits((initialBasic.estimatedAge as string) ?? ((initialBasic.ageMode as AgeMode) === "estimated" ? String(initialCase?.age ?? "") : ""), 3),
  );

  const westernMonthRef = useRef<HTMLInputElement | null>(null);

  const westernDayRef = useRef<HTMLInputElement | null>(null);

  const initialPatientAddress =
    typeof initialBasic.address === "string"
      ? initialBasic.address
      : initialDispatch.dispatchAddress
        ? ""
        : (initialCase?.address ?? "");

  const [address, setAddress] = useState(initialPatientAddress);

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

  const [sendHistory, setSendHistory] = useState<SendHistoryItem[]>(initialSendHistory);

  const [historyRefreshing, setHistoryRefreshing] = useState(false);

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

  const [findingsV2, setFindingsV2] = useState(initialFindingsV2);

  const resolvedBirthDateWestern = useMemo(

    () => composeWesternDate(birthWesternYear, birthWesternMonth, birthWesternDay),

    [birthWesternDay, birthWesternMonth, birthWesternYear],

  );

  const birthDate = useMemo(

    () => toDate(

      birthEra,

      birthEraYear,

      birthMonth,

      birthDay,

      resolvedBirthDateWestern || birthDateWestern,

      birthType,

      birthWesternYear,

      birthWesternMonth,

      birthWesternDay,

    ),

    [birthDateWestern, birthDay, birthEra, birthEraYear, birthMonth, birthType, birthWesternDay, birthWesternMonth, birthWesternYear, resolvedBirthDateWestern],

  );

  const calculatedAge = calcAge(birthDate);
  const age = ageMode === "estimated" ? estimatedAge : ageMode === "unknown" ? "" : calculatedAge;
  const ageSummary = ageMode === "estimated" ? (age ? `推定：${age}歳` : "推定") : ageMode === "unknown" ? "不明" : age ? `${age}歳` : "";

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

  const changeFindingsV2ItemState = (sectionId: string, itemId: string, state: FindingState) => {

    setFindingsV2((prev) => {

      const next = structuredClone(prev);

      const target = next[sectionId]?.[itemId];

      if (!target) return prev;

      target.state = state;

      syncFindingsV2SharedState(next, `${sectionId}:${itemId}`, state);

      if (state !== "positive") {

        const fallback = createEmptyCaseFindings()[sectionId]?.[itemId];

        if (fallback) {

          target.details = fallback.details;

        }

      }

      return next;

    });

  };

  const changeFindingsV2Detail = (sectionId: string, itemId: string, detailId: string, value: FindingDetailValue) => {

    setFindingsV2((prev) => {

      const next = structuredClone(prev);

      const target = next[sectionId]?.[itemId];

      if (!target || !(detailId in target.details)) return prev;

      target.details[detailId] = value;

      if (typeof value === "string" && (value === "positive" || value === "negative" || value === "unable" || value === "unselected")) {

        syncFindingsV2SharedState(next, `${sectionId}:${itemId}#${detailId}`, value);

      }

      return next;

    });

  };

  const gcsParts = parseGcsValue(activeVital.consciousnessValue);

  const asSummaryValue = (value: unknown) => {

    if (value === null || value === undefined) return "未入力";

    if (typeof value === "string") return value.trim() ? value : "未入力";

    return String(value);

  };

  const birthSummary =

    birthType === "western"

      ? asSummaryValue(resolvedBirthDateWestern || birthDateWestern)

      : `${birthEra === "reiwa" ? "令和" : birthEra === "heisei" ? "平成" : "昭和"} ${asSummaryValue(

          birthEraYear,

        )}年 ${asSummaryValue(birthMonth)}月 ${asSummaryValue(birthDay)}日`;

  const refreshSendHistory = useCallback(

    async (options?: { quiet?: boolean }) => {

      if (!caseId) return;

      if (!options?.quiet) {

        setHistoryRefreshing(true);

      }

      try {

        const res = await fetch(`/api/cases/send-history?caseRef=${encodeURIComponent(caseId)}`);

        if (!res.ok) return;

        const data = (await res.json()) as { rows?: SendHistoryItem[] };

        if (Array.isArray(data.rows)) {

          const rows = data.rows;

          setSendHistory(rows);

          setConsultTarget((current) => (current ? rows.find((item) => item.targetId === current.targetId) ?? current : current));

        }

      } catch {

        // ignore fetch failures

      } finally {

        if (!options?.quiet) {

          setHistoryRefreshing(false);

        }

      }

    },

    [caseId],

  );

  useEffect(() => {
    if (!tabScrollInitializedRef.current) {
      tabScrollInitializedRef.current = true;
      return;
    }

    tabContentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab]);

  useEffect(() => {

    if (activeTab !== "history") return;

    void refreshSendHistory();

    const timerId = window.setInterval(() => {

      void refreshSendHistory({ quiet: true });

    }, 15000);

    return () => window.clearInterval(timerId);

  }, [activeTab, refreshSendHistory]);

  const handleTransportDecision = async (

    targetId: number,

    status: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED",

    reason?: TransportDecisionPayload,

  ) => {

    const key = String(targetId);

    if (isOfflineRestricted) {

      setConsultError(offlineDecisionReason);

      return false;

    }

    if (!targetId || !caseId || decisionPendingByRequest[key]) return false;

    setDecisionPendingByRequest((prev) => ({ ...prev, [key]: true }));

    try {

      await updateTransportDecision(targetId, {

        caseId,

        action: "DECIDE",

        status,

        reasonCode: reason?.reasonCode,

        reasonText: reason?.reasonText,

      });

      await refreshSendHistory({ quiet: true });

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

        if (!ok) throw new Error("\u642c\u9001\u5224\u65ad\u306e\u9001\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");

        resetTransportDeclineReasonState();

        setConsultDecisionConfirm(null);

        closeConsultModal();

      } catch (error) {

        setTransportDeclineReasonError(error instanceof Error ? error.message : "\u642c\u9001\u8f9e\u9000\u306e\u9001\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");

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

    setTransportDeclineReasonError("\u642c\u9001\u8f9e\u9000\u306e\u9001\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");

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

      const [data, offlineMessages] = await Promise.all([

        fetchCaseConsultDetail<never, ConsultMessage>(targetId),

        listOfflineConsultMessages(targetId),

      ]);

      setConsultMessages([...data.messages, ...offlineMessages]);

    } catch (error) {

      const offlineMessages = await listOfflineConsultMessages(targetId).catch(() => []);

      setConsultMessages(offlineMessages);

      setConsultError(error instanceof Error ? error.message : "\u76f8\u8ac7\u5c65\u6b74\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");

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

      if (isOfflineRestricted) {

        await enqueueConsultReply({ targetId: consultTarget.targetId, serverCaseId: caseId, note: consultNote.trim() });

        setConsultNote("");

        setConsultError("\u30aa\u30d5\u30e9\u30a4\u30f3\u306e\u305f\u3081\u672a\u9001\u4fe1\u30ad\u30e5\u30fc\u306b\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002");

        await fetchConsultMessages(consultTarget.targetId);

        return;

      }

      await sendCaseConsultReply(consultTarget.targetId, consultNote.trim());

      setConsultNote("");

      await fetchConsultMessages(consultTarget.targetId);

    } catch (error) {

      setConsultError(error instanceof Error ? error.message : "\u76f8\u8ac7\u30b3\u30e1\u30f3\u30c8\u9001\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");

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

      if (!ok) throw new Error("\u642c\u9001\u5224\u65ad\u306e\u9001\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");

      setConsultDecisionConfirm(null);

      closeConsultModal();

    } catch (error) {

      setConsultError(error instanceof Error ? error.message : "\u642c\u9001\u5224\u65ad\u306e\u9001\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");

    } finally {

      setConsultSending(false);

    }

  };

  const findingsV2Payload = findingsV2;

  const findingsV2Summary = buildChangedFindingsSummary(CASE_FINDING_SECTIONS_V2, findingsV2);

  const summaryData = buildCaseSummaryData({

    caseId,

    nameUnknown,

    name,

    gender,

    birthSummary,

    incidentType,

    age: ageSummary,

    address,

    phone,

    adl,

    allergy,

    dnarSummary,

    weight,

    relatedPeople,

    pastHistories,

    vitals,

    findingSectionsV2: CASE_FINDING_SECTIONS_V2,

    findingsV2,

    asSummaryValue,

  });

  const buildCasePayload = () => {

    return {

      caseId,

      division: initialCase?.division ?? "1",

      awareDate: dispatchContext.awareDate,

      awareTime: dispatchContext.awareTime,

      patientName: nameUnknown ? "不明" : name || "不明",

      age: age ? Number(age) : 0,

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

          birthDateWestern: resolvedBirthDateWestern || birthDateWestern,

          birthEra,

          birthEraYear,

          birthMonth,

          birthDay,

          birthSummary,

          calculatedAge,
          ageMode,
          estimatedAge,
          ageSummary,

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

          incidentType,

          dispatchSummary,

          chiefComplaint,

        },

        vitals,

        changedFindings: findingsV2Summary.payloadEntries,


        findingsV2: findingsV2Payload,

        sendHistory,

      },

    };

  };

  useEffect(() => {

    if (readOnly) return;

    const timerId = window.setTimeout(() => {

      const payload = buildCasePayload();

      const snapshot = JSON.stringify(payload);

      if (autoSaveSnapshotRef.current === snapshot) return;

      void saveOfflineCaseDraft({

        localCaseId: caseId,

        serverCaseId: mode === "edit" ? caseId : undefined,

        payload,

        syncStatus: mode === "edit" ? "queued" : "local_only",

      }).then(async (draft) => {

        if (isOfflineRestricted && mode === "edit") {

          await enqueueCaseUpdate({

            localCaseId: caseId,

            serverCaseId: caseId,

            payload,

            baseServerUpdatedAt: draft.lastKnownServerUpdatedAt ?? null,

          });

        }

        autoSaveSnapshotRef.current = snapshot;

        setDraftSavedAt(draft.updatedAt);

      }).catch(() => undefined);

    }, 1200);

    return () => window.clearTimeout(timerId);

  });

  const persistCase = async () => {

    const payload = buildCasePayload();

    return createCaseRecord<typeof payload, { caseId?: string }>(payload);

  };

  const validateAgeDependentRequired = (): string | null => {

    const ageValue = Number(age);

    if (!Number.isFinite(ageValue)) return null;

    const normalizedWeight = String(weight ?? "").trim();

    const normalizedAdl = String(adl ?? "").trim();

    if (ageMode !== "estimated" && ageValue < 12 && !normalizedWeight) {

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

      if (isOfflineRestricted) {

        const payload = buildCasePayload();

        const draft = await saveOfflineCaseDraft({

          localCaseId: caseId,

          serverCaseId: mode === "edit" ? caseId : undefined,

          payload,

          syncStatus: mode === "edit" ? "queued" : "local_only",

        });

        if (mode === "edit") {

          await enqueueCaseUpdate({

            localCaseId: caseId,

            serverCaseId: caseId,

            payload,

            baseServerUpdatedAt: draft.lastKnownServerUpdatedAt ?? null,

          });

        }

        setSaveState("saved");

        setSaveMessage(mode === "edit" ? "端末に保存し、同期待ちに追加しました: " + caseId : "端末に保存しました: " + caseId);

        return;

      }

      const data = await persistCase();

      await deleteOfflineCaseDraft(caseId).catch(() => undefined);

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

      if (isOfflineRestricted) {

        const payload = buildCasePayload();

        const draft = await saveOfflineCaseDraft({

          localCaseId: caseId,

          serverCaseId: mode === "edit" ? caseId : undefined,

          payload,

          syncStatus: mode === "edit" ? "queued" : "local_only",

        });

        if (mode === "edit") {

          await enqueueCaseUpdate({

            localCaseId: caseId,

            serverCaseId: caseId,

            payload,

            baseServerUpdatedAt: draft.lastKnownServerUpdatedAt ?? null,

          });

        }

        setSaveState("saved");

        setSaveMessage(mode === "edit" ? "端末に保存し、同期待ちに追加しました: " + caseId : "端末に保存しました: " + caseId);

      } else {

        await persistCase();

        await deleteOfflineCaseDraft(caseId).catch(() => undefined);

        setSaveState("saved");

        setSaveMessage(`保存完了: ${caseId}`);

      }

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

      age: ageSummary || "",

      address,

      phone,

      gender: gender === "male" ? "男性" : gender === "female" ? "女性" : "不明",

      birthSummary,

      incidentType,

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

      changedFindings: findingsV2Summary.payloadEntries,

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

    <div className="dashboard-shell ems-viewport-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900" data-ems-scale={displayProfile.scale} data-ems-density={displayProfile.density} style={{ backgroundImage: "none" }}>

      <div className="flex h-full">

        <Sidebar

          isOpen={isSidebarOpen}

          onToggle={() => setIsSidebarOpen((v) => !v)}

          operatorName={operatorName}

          operatorCode={operatorCode}

        />

        <main className="app-shell-main ems-viewport-main min-w-0 flex-1 overflow-auto">

          <div className="page-frame page-frame--wide page-stack page-stack--lg ems-page w-full min-w-0">

            <div className="sticky top-0 z-30 bg-[var(--dashboard-bg)] pb-1.5">

              <header className="mb-2 flex items-start justify-between gap-4 pt-1">

                <div className="min-w-0">

                  <p className="portal-eyebrow portal-eyebrow--ems">CASE MANAGEMENT</p>

                  <div className="mt-1 flex items-center gap-3">

                    <h1 className="ems-type-title shrink-0 text-lg font-bold tracking-tight text-slate-900">

                      {mode === "create" ? "\u4e8b\u6848\u4f5c\u6210" : "\u4e8b\u6848\u7de8\u96c6"}

                    </h1>

                    <div className="min-w-0 flex-1 flex justify-center">

                      <OfflineStatusBanner compact />

                    </div>

                  </div>

                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">

                  {mode === "edit" ? (

                    <Link href="/cases/search" className="ems-type-button inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700">

                      {"一覧へ戻る"}

                    </Link>

                  ) : null}

                  <Link href="/" className="ems-type-button inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700">

                    {"ホームへ戻る"}

                  </Link>

                  <button

                    type="button"

                    onClick={handleSave}

                    disabled={readOnly || saveState === "saving"}

                    className="ems-type-button inline-flex items-center rounded-xl bg-[var(--accent-blue)] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"

                  >

                    {readOnly ? "閲覧専用" : saveState === "saving" ? "保存中..." : "保存"}

                  </button>

                </div>

              </header>

                      <div className="mb-3 flex flex-wrap items-center gap-2">

                {restoredLocalDraft && restoredDraftAt && restoredDraftAt === draftSavedAt ? (

                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">

                    {restoredConflictDraft ? "競合したローカル下書きを復元しました。" : "ローカル下書きを復元しました。"}

                  </span>

                ) : null}

                {restoredConflictDraft ? (

                  <Link href="/settings/offline-queue" className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700">

                    {"競合内容を確認"}

                  </Link>

                ) : null}

                {draftSavedAt ? (

                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">

                    {"下書き更新: "}{new Date(draftSavedAt).toLocaleTimeString("ja-JP")}

                  </span>

                ) : null}

                {saveMessage ? (

                  <span

                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${

                      saveState === "saved"

                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"

                        : "border-rose-200 bg-rose-50 text-rose-700"

                    }`}

                  >

                    {saveMessage}

                  </span>

                ) : null}

              </div>

              <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200/80">

                <div className="flex flex-wrap items-center justify-between gap-1.5">

                  <div className="flex flex-wrap gap-1.5">

                    {TABS.map((tab) => (

                      <button

                        key={tab.id}

                        type="button"

                        onClick={() => setActiveTab(tab.id)}

                        className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold leading-none ${activeTab === tab.id ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}

                      >

                        {tab.label}

                      </button>

                    ))}

                  </div>

                  {readOnly ? null : (

                    <button

                      type="button"

                      onClick={handleGoHospitalSelection}

                      className="inline-flex min-w-[128px] items-center justify-center rounded-xl bg-[var(--accent-blue)] px-3.5 py-1.5 text-[12px] font-semibold leading-none text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"

                    >

                      {"病院選定へ"}

                    </button>

                  )}

                </div>

                <div className="mt-2 grid grid-cols-12 gap-2">

                  <label className="col-span-12 md:col-span-3 flex min-w-0 flex-col gap-1">

                    <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"覚知日付"}</span>

                    <input

                      type="date"

                      value={dispatchContext.awareDate}

                      onChange={(e) => setDispatchContext((prev) => ({ ...prev, awareDate: e.target.value }))}

                      className="ems-aware-input ems-control ems-type-body h-9 rounded-lg border border-slate-200 bg-white text-xs text-left"

                    />

                  </label>

                  <label className="col-span-12 md:col-span-2 flex min-w-0 flex-col gap-1">

                    <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"覚知時間"}</span>

                    <input

                      type="time"

                      value={dispatchContext.awareTime}

                      onChange={(e) => setDispatchContext((prev) => ({ ...prev, awareTime: e.target.value }))}

                      className="ems-aware-input ems-control ems-type-body h-9 appearance-none rounded-lg border border-slate-200 bg-white text-xs text-left"

                    />

                  </label>

                  <label className="col-span-12 md:col-span-4 flex min-w-0 flex-col gap-1">

                    <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"指令先住所"}</span>

                    <input

                      value={dispatchContext.dispatchAddress}

                      onChange={(e) => setDispatchContext((prev) => ({ ...prev, dispatchAddress: e.target.value }))}

                      placeholder={"市 / 区まで入力 例: 三鷹市、世田谷区"}

                      className="ems-control ems-type-body h-9 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-left"

                    />

                  </label>

                  <label className="col-span-12 md:col-span-3 flex min-w-0 flex-col gap-1">

                    <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"事案種別"}</span>

                    <select

                      value={incidentType}

                      onChange={(e) => setIncidentType(e.target.value as IncidentType | "")}

                      className="ems-control ems-type-body h-9 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-left"

                    >

                      <option value="">{"選択"}</option>

                      {INCIDENT_TYPE_OPTIONS.map((option) => (

                        <option key={option} value={option}>

                          {option}

                        </option>

                      ))}

                    </select>

                  </label>

                </div>

              </div>

            </div>

            <div ref={tabContentTopRef} className="scroll-mt-24" />

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
                ageMode={ageMode}
                setAgeMode={setAgeMode}
                estimatedAge={estimatedAge}
                setEstimatedAge={setEstimatedAge}

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

                formatWeightInput={formatWeightInput}

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

              <>

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

              />

              <CaseFindingsV2Panel

                sections={CASE_FINDING_SECTIONS_V2}

                findings={findingsV2}

                onChangeItemState={changeFindingsV2ItemState}

                onChangeDetail={changeFindingsV2Detail}

              />

              </>

            ) : null}

            {activeTab === "summary" ? (

              <CaseFormSummaryTab

                headerText="\u57fa\u672c\u60c5\u5831\u30fb\u8981\u8acb\u6982\u8981\u30fb\u30d0\u30a4\u30bf\u30eb\u30fb\u5909\u66f4\u6240\u898b\u3092\u4e00\u753b\u9762\u3067\u78ba\u8a8d\u3057\u307e\u3059\u3002"

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

                refreshing={historyRefreshing}

                disableDecisions={isOfflineRestricted}

                decisionDisabledReason={offlineDecisionReason}

                decisionPendingByRequest={decisionPendingByRequest}

                onRefresh={() => void refreshSendHistory()}

                onSelectDecision={setDecisionConfirm}

                onOpenConsult={(item) => void openConsultModal(item)}

              />

            ) : null}

          </div>

        </main>

      </div>

      <ConsultChatModal

        open={consultModalOpen}

        title={consultTarget?.hospitalName ?? "\u76f8\u8ac7\u30c1\u30e3\u30c3\u30c8"}

        subtitle={consultTarget ? `${caseId} / ${consultTarget.requestId}` : undefined}

        status={consultTarget?.status}

        messages={consultMessages}

        loading={consultLoading}

        error={consultError}

        note={consultNote}

        noteLabel="A\u5074\u30b3\u30e1\u30f3\u30c8"

        notePlaceholder="HP\u5074\u3078\u9001\u308b\u76f8\u8ac7\u56de\u7b54\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044"

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

                title={isOfflineRestricted ? offlineDecisionReason : undefined}

                disabled={isOfflineRestricted || consultSending || !consultTarget?.canDecide}

                onClick={() => setConsultDecisionConfirm("TRANSPORT_DECIDED")}

                className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"

              >

                \u642c\u9001\u6c7a\u5b9a

              </button>

              <button

                type="button"

                title={isOfflineRestricted ? offlineDecisionReason : undefined}

                disabled={isOfflineRestricted || consultSending || !consultTarget?.targetId}

                onClick={() => setConsultDecisionConfirm("TRANSPORT_DECLINED")}

                className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"

              >

                \u642c\u9001\u8f9e\u9000

              </button>

            </>

          )

        }

        confirmSection={

          consultDecisionConfirm === "TRANSPORT_DECIDED" ? (

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

              <p className="text-sm font-semibold text-slate-900">

                {consultDecisionConfirm === "TRANSPORT_DECIDED" ? "\u642c\u9001\u6c7a\u5b9a\u3092\u9001\u4fe1\u3057\u307e\u3059\u304b\uff1f" : "\u642c\u9001\u8f9e\u9000\u3092\u9001\u4fe1\u3057\u307e\u3059\u304b\uff1f"}

              </p>

              <div className="mt-3 flex justify-end gap-2">

                <button

                  type="button"

                  disabled={consultSending}

                  onClick={() => setConsultDecisionConfirm(null)}

                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  \u30ad\u30e3\u30f3\u30bb\u30eb

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

        title="\u642c\u9001\u8f9e\u9000\u7406\u7531\u3092\u9078\u629e"

        description="\u642c\u9001\u8f9e\u9000\u3092\u9001\u4fe1\u3059\u308b\u306b\u306f\u7406\u7531\u306e\u9078\u629e\u304c\u5fc5\u8981\u3067\u3059\u3002"

        options={TRANSPORT_DECLINED_REASON_OPTIONS}

        value={transportDeclineReasonCode}

        textValue={transportDeclineReasonText}

        error={transportDeclineReasonError}

        sending={consultSending || Boolean(decisionConfirm && decisionPendingByRequest[String(decisionConfirm.targetId)])}

        confirmLabel="\u642c\u9001\u8f9e\u9000\u3092\u9001\u4fe1"

        onClose={closeTransportDeclineDialog}

        onChangeValue={setTransportDeclineReasonCode}

        onChangeText={setTransportDeclineReasonText}

        onConfirm={() => void confirmTransportDecline()}

      />

      {decisionConfirm && decisionConfirm.action === "TRANSPORT_DECIDED" ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CONFIRM</p>

            <h3 className="mt-2 text-lg font-bold text-slate-900">\u642c\u9001\u6c7a\u5b9a\u3092\u9001\u4fe1\u3057\u307e\u3059\u304b\uff1f</h3>

            <p className="mt-2 text-sm text-slate-600">\u3053\u306e\u75c5\u9662\u3092\u642c\u9001\u5148\u3068\u3057\u3066\u78ba\u5b9a\u3057\u307e\u3059\u3002\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f</p>

            <div className="mt-5 flex justify-end gap-2">

              <button

                type="button"

                onClick={() => setDecisionConfirm(null)}

                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"

              >

                \u30ad\u30e3\u30f3\u30bb\u30eb

              </button>

              <button

                type="button"

                disabled={Boolean(decisionPendingByRequest[String(decisionConfirm.targetId)])}

                onClick={() => void confirmTransportDecision()}

                className="inline-flex h-10 items-center rounded-xl bg-[var(--accent-blue)] px-4 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)] disabled:cursor-not-allowed disabled:bg-slate-300"

              >

                {decisionPendingByRequest[String(decisionConfirm.targetId)] ? "送信中..." : "搬送決定"}

              </button>

            </div>

          </div>

        </div>

      ) : null}

    </div>

  );

}
