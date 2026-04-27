"use client";

import { ArrowUpIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import dynamic from "next/dynamic";

import { useRouter } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";

import { CaseFormBasicTab } from "@/components/cases/CaseFormBasicTab";
import { PatientIdentityOcrPanel } from "@/components/cases/PatientIdentityOcrPanel";

import { useEmsDisplayProfile } from "@/components/ems/useEmsDisplayProfile";

import { Sidebar } from "@/components/home/Sidebar";

import { OfflineProvider } from "@/components/offline/OfflineProvider";

import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";

import { useOfflineState } from "@/components/offline/useOfflineState";

import { UserModeBadge } from "@/components/shared/UserModeBadge";
import { getEmsOperationalModeDescription, getEmsOperationalModeShortLabel, isEmsOperationalMode } from "@/lib/emsOperationalMode";

import {

  createCaseRecord,

} from "@/lib/casesClient";

import { CASE_FINDING_SECTIONS_V2, createEmptyCaseFindings } from "@/lib/caseFindingsConfig";

import { normalizeCaseFindings } from "@/lib/caseFindingsNormalizer";

import type { CaseFindings, FindingDetailValue, FindingState } from "@/lib/caseFindingsSchema";

import { buildChangedFindingsSummary } from "@/lib/caseFindingsSummary";
import { extractAsciiDigits, normalizeAsciiNumberText } from "@/lib/inputDigits";

import { enqueueCaseUpdate } from "@/lib/offline/offlineCaseQueue";
import { saveOfflineEmsSetting } from "@/lib/offline/offlineEmsSettings";

import { deleteOfflineCaseDraft, generateOfflineCaseId, getOfflineCaseDraft, saveOfflineCaseDraft } from "@/lib/offline/offlineCaseDrafts";

import type { CaseRecord } from "@/lib/mockCases";
import type { AppMode } from "@/lib/appMode";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";
import {
  normalizeTriageAssessment,
  START_TRIAGE_TAG_LABELS,
  type TriageAssessment,
} from "@/lib/triageAssessment";

const CaseFindingsV2Panel = dynamic(async () => (await import("@/components/cases/CaseFindingsV2Panel")).CaseFindingsV2Panel);
const CaseFormVitalsTab = dynamic(async () => (await import("@/components/cases/CaseFormVitalsTab")).CaseFormVitalsTab);
const CaseFormSummaryPane = dynamic(async () => (await import("@/components/cases/CaseFormSummaryPane")).CaseFormSummaryPane);
const CaseFormHistoryPane = dynamic(async () => (await import("@/components/cases/CaseFormHistoryPane")).CaseFormHistoryPane);

type CaseFormPageProps = {

  mode: "create" | "edit";

  initialCase?: CaseRecord;

  initialPayload?: unknown;

  operatorName?: string;

  operatorCode?: string;

  currentMode?: AppMode;

  operationalMode?: EmsOperationalMode;

  readOnly?: boolean;

};

type CaseFormPageContentProps = CaseFormPageProps & {

  restoredDraftAt?: string | null;

  restoredLocalDraft?: boolean;

  restoredConflictDraft?: boolean;

  serverSnapshot?: unknown;

};

type TabId = "basic" | "vitals" | "summary" | "history";

type BirthType = "western" | "japanese";

type Era = "reiwa" | "heisei" | "showa";

type Gender = "male" | "female" | "unknown";
type AgeMode = "auto" | "unknown" | "estimated";

type Arrhythmia = "yes" | "no" | "unknown";

type ConsciousnessType = "jcs" | "gcs";

type DnarOption = "" | "full_code" | "dnar" | "other";
type OcrBirthField = {
  westernYear: string;
  month: string;
  day: string;
};

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

function TriageFlowPanel({
  dispatchAddress,
  chiefComplaint,
  dispatchSummary,
  triageAssessment,
  sendHistory,
}: {
  dispatchAddress: string;
  chiefComplaint: string;
  dispatchSummary: string;
  triageAssessment: TriageAssessment;
  sendHistory: SendHistoryItem[];
}) {
  const reportReady = Boolean(dispatchAddress.trim() && (chiefComplaint.trim() || dispatchSummary.trim()));
  const startReady = Boolean(triageAssessment.start.tag);
  const patReady = Boolean(triageAssessment.anatomical.tag);
  const assignmentReady = sendHistory.length > 0;
  const stages = [
    {
      label: "本部報告",
      ready: reportReady,
      value: reportReady ? "報告内容あり" : "住所/主訴待ち",
    },
    {
      label: "START自動判定",
      ready: startReady,
      value: triageAssessment.start.tag ? START_TRIAGE_TAG_LABELS[triageAssessment.start.tag] : "保留",
    },
    {
      label: "PAT自動判定",
      ready: patReady,
      value: triageAssessment.anatomical.tag ? START_TRIAGE_TAG_LABELS[triageAssessment.anatomical.tag] : "保留",
    },
    {
      label: "搬送先指示",
      ready: assignmentReady,
      value: assignmentReady ? `${sendHistory.length}件` : "本部からの指示待ち",
    },
  ];

  return (
    <div className="rounded-[18px] border border-rose-200/90 bg-white px-3.5 py-3 shadow-[0_14px_28px_-24px_rgba(190,24,93,0.3)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-rose-700">TRIAGE FLOW</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-700">各隊は本部へ報告し、病院連絡と搬送先振り分けは dispatch に集約します。</p>
        </div>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700">
          {stages.filter((stage) => stage.ready).length}/4
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className={`rounded-xl px-3 py-2.5 ${
              stage.ready ? "border border-rose-200 bg-rose-50 text-rose-900" : "border border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <p className="text-[10px] font-semibold tracking-[0.12em]">{stage.label}</p>
            <p className="mt-1 truncate text-[12px] font-bold">{stage.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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

const TRIAGE_TABS: Array<{ id: TabId; label: string }> = [
  { id: "basic", label: "初動情報" },
  { id: "vitals", label: "最小バイタル" },
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

        <CaseFormPageContent
          {...props}
          initialPayload={resolvedInitialPayload}
          restoredDraftAt={restoredDraftAt}
          restoredLocalDraft={restoredLocalDraft}
          restoredConflictDraft={restoredConflictDraft}
          serverSnapshot={props.mode === "edit" ? props.initialPayload ?? null : null}
        />

      ) : (

        <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">

          <div className="flex h-full items-center justify-center">

            <div className="ds-panel-surface rounded-2xl px-6 py-4 text-sm text-slate-500 shadow-sm">{"下書きを読み込み中..."}</div>

          </div>

        </div>

      )}

    </OfflineProvider>

  );

}

function CaseFormPageContent({
  mode,
  initialCase,
  initialPayload,
  operatorName,
  operatorCode,
  currentMode = "LIVE",
  operationalMode: initialOperationalMode = "STANDARD",
  readOnly = false,
  restoredDraftAt = null,
  restoredLocalDraft = false,
  restoredConflictDraft = false,
  serverSnapshot = null,
}: CaseFormPageContentProps) {

  const router = useRouter();

  const { isOffline } = useOfflineState();

  const isOfflineRestricted = isOffline;
  const [operationalMode, setOperationalMode] = useState<EmsOperationalMode>(initialOperationalMode);
  const [modeSwitchState, setModeSwitchState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [modeSwitchMessage, setModeSwitchMessage] = useState("");

  useEffect(() => {
    setOperationalMode(initialOperationalMode);
  }, [initialOperationalMode]);

  const switchToTriageMode = async () => {
    if (readOnly || operationalMode === "TRIAGE" || modeSwitchState === "saving") return;

    setModeSwitchState("saving");
    setModeSwitchMessage("");

    try {
      if (isOffline) {
        await saveOfflineEmsSetting("operationalMode", { operationalMode: "TRIAGE" });
        setOperationalMode("TRIAGE");
        setModeSwitchState("saved");
        setModeSwitchMessage("オフライン保存: この画面をTRIAGE表示へ切り替えました。オンライン復帰後に同期します。");
        return;
      }

      const response = await fetch("/api/settings/ambulance/operational-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationalMode: "TRIAGE" }),
      });
      const data = (await response.json().catch(() => ({}))) as { operationalMode?: unknown; message?: string };
      if (!response.ok) {
        setModeSwitchState("error");
        setModeSwitchMessage(data.message ?? "トリアージモードへの切り替えに失敗しました。");
        return;
      }

      const nextOperationalMode = isEmsOperationalMode(data.operationalMode) ? data.operationalMode : "TRIAGE";
      setOperationalMode(nextOperationalMode);
      setModeSwitchState("saved");
      setModeSwitchMessage("トリアージモードへ切り替えました。この事案から本部報告へ進めます。");
      router.refresh();
    } catch {
      setModeSwitchState("error");
      setModeSwitchMessage("通信に失敗しました。");
    }
  };

  const isTriage = operationalMode === "TRIAGE";
  const visibleTabs = isTriage ? TRIAGE_TABS : TABS;

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
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (visibleTabs.some((tab) => tab.id === activeTab)) return;
    setActiveTab("basic");
  }, [activeTab, visibleTabs]);

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

  const applyPatientIdentityOcrFields = (input: { name: string | null; address: string | null; birth: OcrBirthField | null }) => {
    if (input.name?.trim()) {
      setName(input.name.trim());
      setNameUnknown(false);
    }
    if (input.address?.trim()) {
      setAddress(input.address.trim());
    }
    if (input.birth) {
      setBirthType("western");
      setBirthWesternYear(input.birth.westernYear);
      setBirthWesternMonth(input.birth.month);
      setBirthWesternDay(input.birth.day);
      setBirthDateWestern(`${input.birth.westernYear}-${input.birth.month}-${input.birth.day}`);
    }
  };

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
  const [triageAssessment, setTriageAssessment] = useState<TriageAssessment>(() => normalizeTriageAssessment(initialSummary.triageAssessment));

  const [vitals, setVitals] = useState<VitalSet[]>(initialVitals.length > 0 ? initialVitals : [createEmptyVital()]);

  const [activeVitalIndex, setActiveVitalIndex] = useState(0);

  const [sendHistory, setSendHistory] = useState<SendHistoryItem[]>(initialSendHistory);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);

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

  const birthSummary =
    birthType === "western"
      ? resolvedBirthDateWestern || birthDateWestern || "未入力"
      : `${birthEra === "reiwa" ? "令和" : birthEra === "heisei" ? "平成" : "昭和"} ${birthEraYear?.trim() ? birthEraYear : "未入力"}年 ${birthMonth?.trim() ? birthMonth : "未入力"}月 ${birthDay?.trim() ? birthDay : "未入力"}日`;

  useEffect(() => {
    if (!tabScrollInitializedRef.current) {
      tabScrollInitializedRef.current = true;
      return;
    }

    tabContentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab]);

  const findingsV2Payload = findingsV2;
  const findingsV2Summary = useMemo(() => buildChangedFindingsSummary(CASE_FINDING_SECTIONS_V2, findingsV2), [findingsV2]);

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
          triageAssessment,
          triageDispatchReport: operationalMode === "TRIAGE",
          triageWorkflow: operationalMode === "TRIAGE" ? "DISPATCH_COORDINATED" : undefined,

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

        serverSnapshot: mode === "edit" ? serverSnapshot : null,

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

    const validationError = operationalMode === "TRIAGE" ? null : validateAgeDependentRequired();

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

          serverSnapshot: mode === "edit" ? serverSnapshot : null,

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

    const validationError = operationalMode === "TRIAGE" ? null : validateAgeDependentRequired();

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

          serverSnapshot: mode === "edit" ? serverSnapshot : null,

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
      triageAssessment,

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

    if (operationalMode === "TRIAGE") {
      setSaveMessage(`本部へ報告しました: ${caseId}`);
      router.push("/cases/search");
      return;
    }

    router.push(`/hospitals/search?caseId=${encodeURIComponent(caseId)}`);

  };

  const handleMainScroll = () => {

    const next = (mainScrollRef.current?.scrollTop ?? 0) > 320;

    setShowScrollTopButton((current) => (current === next ? current : next));

  };

  const scrollToTop = () => {

    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  };

  return (

    <div
      className="dashboard-shell ems-viewport-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900"
      data-ems-scale={displayProfile.scale}
      data-ems-density={displayProfile.density}
      data-ems-operation={operationalMode === "TRIAGE" ? "triage" : "standard"}
      style={{ backgroundImage: "none" }}
    >

      <div className="flex h-full">

        <Sidebar

          isOpen={isSidebarOpen}

          onToggle={() => setIsSidebarOpen((v) => !v)}

          operatorName={operatorName}

          operatorCode={operatorCode}

          operationalMode={operationalMode}

        />

        <main ref={mainScrollRef} onScroll={handleMainScroll} className="app-shell-main ems-viewport-main ems-command-canvas min-w-0 flex-1 overflow-auto">

          <div className="page-frame page-frame--wide page-stack ems-page w-full min-w-0">

            <section
              className={`rounded-[22px] px-4 py-3 ${
                operationalMode === "TRIAGE"
                  ? "border border-rose-200/80 bg-white shadow-[0_24px_56px_-40px_rgba(190,24,93,0.5)]"
                  : "border border-blue-100/80 bg-white shadow-[0_14px_34px_-30px_rgba(37,99,235,0.24)]"
              }`}
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-semibold tracking-[0.18em] ${operationalMode === "TRIAGE" ? "text-rose-700" : "text-blue-500"}`}>
                      {operationalMode === "TRIAGE" ? "TRIAGE CASE MANAGEMENT" : "CASE MANAGEMENT"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h1 className="text-[20px] font-bold tracking-[-0.03em] text-slate-950">{mode === "create" ? "事案作成" : "事案編集"}</h1>
                      <span data-testid="ems-case-detail-first-look" className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${operationalMode === "TRIAGE" ? "bg-rose-50 text-rose-700" : "bg-white/90 text-slate-700"}`}>
                        {caseId}
                      </span>
                      <UserModeBadge mode={currentMode} compact />
                      {operationalMode === "TRIAGE" ? (
                        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-rose-700">
                          {getEmsOperationalModeShortLabel(operationalMode)}
                        </span>
                      ) : null}
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${operationalMode === "TRIAGE" ? "bg-rose-50 text-rose-700" : "bg-white/90 text-slate-600"}`}>tablet landscape</span>
                      {draftSavedAt ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${operationalMode === "TRIAGE" ? "bg-rose-50 text-rose-700" : "bg-white/90 text-slate-600"}`}>
                          下書き更新 {new Date(draftSavedAt).toLocaleTimeString("ja-JP")}
                        </span>
                      ) : null}
                      {saveMessage ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            saveState === "saved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {saveMessage}
                        </span>
                      ) : null}
                      {modeSwitchMessage ? (
                        <span
                          data-testid="ems-case-detail-triage-switch-message"
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            modeSwitchState === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {modeSwitchMessage}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                  {mode === "create" ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${operationalMode === "TRIAGE" ? "bg-rose-50 text-rose-700" : "bg-white/90 text-slate-600"}`}>
                      {currentMode === "TRAINING" ? "この事案は training として保存されます" : "この事案は live として保存されます"}
                    </span>
                  ) : null}
                    {!readOnly && operationalMode !== "TRIAGE" ? (
                      <button
                        type="button"
                        data-testid="ems-case-detail-triage-switch"
                        onClick={switchToTriageMode}
                        disabled={modeSwitchState === "saving"}
                        className="inline-flex h-9 items-center rounded-full border border-rose-300 bg-rose-50 px-3 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {modeSwitchState === "saving" ? "切替中..." : "TRIAGEへ切替"}
                      </button>
                    ) : null}
                    {mode === "edit" ? (
                      <Link href="/cases/search" className={`inline-flex h-9 items-center rounded-full px-3 text-[12px] font-semibold transition ${operationalMode === "TRIAGE" ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "bg-white/90 text-slate-700 hover:bg-white"}`}>
                        一覧へ戻る
                      </Link>
                    ) : null}
                    <Link href="/paramedics" className={`inline-flex h-9 items-center rounded-full px-3 text-[12px] font-semibold transition ${operationalMode === "TRIAGE" ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "bg-white/90 text-slate-700 hover:bg-white"}`}>
                      ホームへ戻る
                    </Link>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={readOnly || saveState === "saving"}
                      className={`inline-flex h-9 items-center rounded-full px-3.5 text-[12px] font-semibold text-white transition disabled:opacity-60 ${
                        operationalMode === "TRIAGE"
                          ? "border border-rose-400/60 bg-rose-600 hover:bg-rose-500"
                          : "bg-slate-950 hover:bg-slate-800"
                      }`}
                    >
                      {readOnly ? "閲覧専用" : saveState === "saving" ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  {operationalMode === "TRIAGE" ? (
                    <div data-testid="ems-case-triage-note" className="rounded-[18px] border border-rose-200/90 bg-white/92 px-3.5 py-3 shadow-[0_14px_28px_-24px_rgba(190,24,93,0.3)]">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-rose-700">TRIAGE MODE</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-700">{getEmsOperationalModeDescription(operationalMode)}</p>
                      <p className="mt-2 text-[11px] font-semibold text-rose-700">
                        各隊はSTART/PAT判定と状況報告を本部へ送ります。病院連絡と搬送先の振り分けは dispatch 側に集約します。
                      </p>
                    </div>
                  ) : null}
                  {operationalMode === "TRIAGE" ? (
                    <TriageFlowPanel
                      dispatchAddress={dispatchContext.dispatchAddress}
                      chiefComplaint={chiefComplaint}
                      dispatchSummary={dispatchSummary}
                      triageAssessment={triageAssessment}
                      sendHistory={sendHistory}
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="rounded-full bg-white px-2.5 py-0.5">
                      <OfflineStatusBanner compact />
                    </div>

                    {restoredLocalDraft && restoredDraftAt && restoredDraftAt === draftSavedAt ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {restoredConflictDraft ? "競合したローカル下書きを復元しました。" : "ローカル下書きを復元しました。"}
                      </span>
                    ) : null}
                  </div>

                  {restoredConflictDraft ? (
                    <div className="rounded-[18px] border border-amber-200/90 bg-white/90 px-3.5 py-3 shadow-[0_14px_28px_-24px_rgba(180,83,9,0.28)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold tracking-[0.16em] text-amber-700">OFFLINE CONFLICT</p>
                          <p className="mt-1 text-[13px] font-semibold text-slate-900">サーバー更新後にローカル下書きが残っています</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-600">
                            内容を確認してこの画面で再保存するか、オフラインキューで server 優先整理を行ってください。自動マージはしていません。
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href="/settings/offline-queue" className="inline-flex h-8 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100">
                            競合内容を確認
                          </Link>
                          <button
                            type="button"
                            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                            className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            このまま編集
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 border-t border-white/70 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {visibleTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-[11px] font-semibold tracking-[0.01em] transition ${
                            activeTab === tab.id
                              ? "bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.42),inset_0_1px_0_rgba(255,255,255,0.9)]"
                              : operationalMode === "TRIAGE"
                                ? "border border-rose-100 bg-rose-50 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-rose-200 hover:bg-rose-100"
                                : "border border-slate-200 bg-slate-200/72 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] hover:border-blue-200 hover:bg-blue-50/70 hover:text-blue-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {readOnly ? null : (
                      <button
                        type="button"
                        onClick={handleGoHospitalSelection}
                        className={`inline-flex h-9 min-w-[140px] items-center justify-center rounded-xl px-3.5 text-[11px] font-semibold tracking-[0.01em] text-white transition ${
                          operationalMode === "TRIAGE"
                            ? "border border-rose-400/70 bg-rose-600 shadow-[0_18px_36px_-22px_rgba(127,29,29,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-rose-500"
                            : "bg-[color-mix(in_srgb,var(--accent-blue),white_14%)] shadow-[0_10px_24px_-18px_rgba(37,99,235,0.72),inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_8%)]"
                        }`}
                      >
                        {operationalMode === "TRIAGE" ? "本部へ報告" : "病院選定へ"}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-12 gap-2">

                    <label className="col-span-12 md:col-span-3 flex min-w-0 flex-col gap-1">

                      <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"覚知日付"}</span>

                      <input type="date" value={dispatchContext.awareDate} onChange={(e) => setDispatchContext((prev) => ({ ...prev, awareDate: e.target.value }))} className="ems-aware-input ems-control ems-type-body h-8 rounded-lg border border-slate-200 bg-white text-[11px] text-left" />

                    </label>

                    <label className="col-span-12 md:col-span-2 flex min-w-0 flex-col gap-1">

                      <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"覚知時間"}</span>

                      <input type="time" value={dispatchContext.awareTime} onChange={(e) => setDispatchContext((prev) => ({ ...prev, awareTime: e.target.value }))} className="ems-aware-input ems-control ems-type-body h-8 appearance-none rounded-lg border border-slate-200 bg-white text-[11px] text-left" />

                    </label>

                    <label className="col-span-12 md:col-span-4 flex min-w-0 flex-col gap-1">

                      <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"指令先住所"}</span>

                      <input value={dispatchContext.dispatchAddress} onChange={(e) => setDispatchContext((prev) => ({ ...prev, dispatchAddress: e.target.value }))} placeholder={"市 / 区まで入力 例: 三鷹市、世田谷区"} className="ems-control ems-type-body h-8 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-left" />

                    </label>

                    <label className="col-span-12 md:col-span-3 flex min-w-0 flex-col gap-1">

                      <span className="ems-type-label text-[10px] font-semibold text-slate-500">{"事案種別"}</span>

                      <select value={incidentType} onChange={(e) => setIncidentType(e.target.value as IncidentType | "")} className="ems-control ems-type-body h-8 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-left">

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
            </section>

            <div className={`pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ${showScrollTopButton ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
              <button
                type="button"
                onClick={scrollToTop}
                className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950/92 px-4 text-[11px] font-semibold tracking-[0.01em] text-white shadow-[0_18px_38px_-24px_rgba(15,23,42,0.7)] backdrop-blur-sm transition hover:bg-slate-900"
              >
                <ArrowUpIcon className="h-4 w-4" aria-hidden />
                <span>一番上へ</span>
              </button>
            </div>

            <div ref={tabContentTopRef} className="scroll-mt-4" />

            <section className={`rounded-[24px] border bg-white px-3 py-3 shadow-[0_20px_46px_-38px_rgba(15,23,42,0.32)] ${isTriage ? "border-rose-200/80" : "border-blue-100/80"}`}>

            {activeTab === "basic" ? (

              <CaseFormBasicTab
                operationalMode={operationalMode}
                patientIdentityOcrSlot={<PatientIdentityOcrPanel onApplyFields={applyPatientIdentityOcrFields} />}

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

              <div className="space-y-4">

              <CaseFormVitalsTab
                operationalMode={operationalMode}
                dispatchSummary={dispatchSummary}

                chiefComplaint={chiefComplaint}
                triageAssessment={triageAssessment}
                setTriageAssessment={setTriageAssessment}


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

              {isTriage ? null : <CaseFindingsV2Panel

                sections={CASE_FINDING_SECTIONS_V2}

                findings={findingsV2}

                onChangeItemState={changeFindingsV2ItemState}

                onChangeDetail={changeFindingsV2Detail}

              />}

              </div>

            ) : null}

            {activeTab === "summary" ? (
              <CaseFormSummaryPane
                caseId={caseId}
                nameUnknown={nameUnknown}
                name={name}
                gender={gender}
                birthSummary={birthSummary}
                incidentType={incidentType}
                ageSummary={ageSummary}
                address={address}
                phone={phone}
                adl={adl}
                allergy={allergy}
                dnarSummary={dnarSummary}
                weight={weight}
                relatedPeople={relatedPeople}
                pastHistories={pastHistories}
                specialNote={specialNote}
                dispatchSummary={dispatchSummary}
                chiefComplaint={chiefComplaint}
                vitals={vitals}
                findingsV2={findingsV2}
              />

            ) : null}

            {activeTab === "history" ? (
              <CaseFormHistoryPane
                active={activeTab === "history"}
                caseId={caseId}
                operationalMode={operationalMode}
                sendHistory={sendHistory}
                onSendHistoryChange={setSendHistory}
                readOnly={readOnly}
                isOfflineRestricted={isOfflineRestricted}
                offlineDecisionReason={offlineDecisionReason}
              />

            ) : null}

            </section>

          </div>

        </main>

      </div>

    </div>

  );

}
