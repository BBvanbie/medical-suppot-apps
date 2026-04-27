"use client";

import { extractAsciiDigits } from "@/lib/inputDigits";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";
import {
  ANATOMICAL_TRIAGE_FINDINGS,
  calculatePatTriageTag,
  calculateStartTriageTag,
  START_TRIAGE_TAG_LABELS,
  type StartTriageTag,
  type TriageAssessment,
} from "@/lib/triageAssessment";

type ConsciousnessType = "jcs" | "gcs";
type Arrhythmia = "yes" | "no" | "unknown";

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

type GcsParts = {
  e: string;
  v: string;
  m: string;
};

type CaseFormVitalsTabProps = {
  operationalMode?: EmsOperationalMode;
  dispatchSummary: string;
  chiefComplaint: string;
  triageAssessment: TriageAssessment;
  setTriageAssessment: (updater: (prev: TriageAssessment) => TriageAssessment) => void;
  setDispatchSummary: (value: string) => void;
  setChiefComplaint: (value: string) => void;
  vitals: VitalSet[];
  activeVitalIndex: number;
  setActiveVitalIndex: (index: number) => void;
  activeVital: VitalSet;
  addVitalFromCurrent: () => void;
  updateVital: <K extends keyof VitalSet>(key: K, value: VitalSet[K]) => void;
  gcsParts: GcsParts;
  composeGcsValue: (e: string, v: string, m: string) => string;
  jcsOptions: string[];
  gcsEOptions: string[];
  gcsVOptions: string[];
  gcsMOptions: string[];
  respiratoryPatterns: string[];
  breathOdors: string[];
  ecgOptions: string[];
  lightReflexOptions: string[];
  gazeOptions: string[];
  formatPupilInput: (raw: string) => string;
  formatTemperatureInput: (raw: string) => string;
};

const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900 disabled:bg-slate-100";
const selectClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900";

function Surface({ eyebrow, title, children, tone = "standard" }: { eyebrow: string; title: string; children: React.ReactNode; tone?: "standard" | "triage" }) {
  const isTriage = tone === "triage";
  return (
    <div className={`rounded-[26px] border bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)] ${isTriage ? "border-rose-200/80" : "border-blue-100/80"}`}>
      <div className="mb-4">
        <p className={`text-[10px] font-semibold tracking-[0.18em] ${isTriage ? "text-rose-700" : "text-blue-600"}`}>{eyebrow}</p>
        <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function CaseFormVitalsTab(props: CaseFormVitalsTabProps) {
  const {
    operationalMode = "STANDARD",
    dispatchSummary,
    chiefComplaint,
    triageAssessment,
    setTriageAssessment,
    setDispatchSummary,
    setChiefComplaint,
    vitals,
    activeVitalIndex,
    setActiveVitalIndex,
    activeVital,
    addVitalFromCurrent,
    updateVital,
    gcsParts,
    composeGcsValue,
    jcsOptions,
    gcsEOptions,
    gcsVOptions,
    gcsMOptions,
    respiratoryPatterns,
    breathOdors,
    ecgOptions,
    lightReflexOptions,
    gazeOptions,
    formatPupilInput,
    formatTemperatureInput,
  } = props;
  const isTriage = operationalMode === "TRIAGE";
  const updateStart = <K extends keyof TriageAssessment["start"]>(key: K, value: TriageAssessment["start"][K]) => {
    setTriageAssessment((prev) => {
      const nextStart = { ...prev.start, [key]: value };
      return { ...prev, start: { ...nextStart, tag: calculateStartTriageTag(nextStart) } };
    });
  };
  const updateAnatomicalPriority = (priority: TriageAssessment["anatomical"]["priority"]) => {
    setTriageAssessment((prev) => {
      const nextAnatomical = { ...prev.anatomical, priority };
      return { ...prev, anatomical: { ...nextAnatomical, tag: calculatePatTriageTag(nextAnatomical) } };
    });
  };
  const toggleAnatomicalFinding = (finding: string) => {
    setTriageAssessment((prev) => {
      const exists = prev.anatomical.findings.includes(finding);
      const findings = exists
        ? prev.anatomical.findings.filter((item) => item !== finding)
        : [...prev.anatomical.findings, finding];
      const nextAnatomical = { ...prev.anatomical, findings };
      return {
        ...prev,
        anatomical: { ...nextAnatomical, tag: calculatePatTriageTag(nextAnatomical) },
      };
    });
  };
  const updateInjuryDetails = (injuryDetails: string) => {
    setTriageAssessment((prev) => ({ ...prev, injuryDetails }));
  };
  const triageTagOptions: Array<{ key: StartTriageTag; label: string; className: string }> = [
    { key: "green", label: START_TRIAGE_TAG_LABELS.green, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { key: "yellow", label: START_TRIAGE_TAG_LABELS.yellow, className: "bg-amber-50 text-amber-700 ring-amber-200" },
    { key: "red", label: START_TRIAGE_TAG_LABELS.red, className: "bg-rose-600 text-white ring-rose-600" },
    { key: "black", label: START_TRIAGE_TAG_LABELS.black, className: "bg-white text-slate-950 ring-slate-400" },
  ];

  if (isTriage) {
    return (
      <section className="space-y-4">
        <Surface eyebrow="FIELD REPORT" title="本部へ送る状況報告" tone="triage">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">本部報告メモ</span>
              <textarea rows={4} value={dispatchSummary} onChange={(e) => setDispatchSummary(e.target.value)} className="w-full rounded-2xl border border-rose-200 bg-rose-50/35 px-3 py-3 text-[13px] leading-6 text-slate-900" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">主訴・観察メモ</span>
              <textarea rows={4} value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-3 text-[13px] leading-6 text-slate-900" />
            </label>
          </div>
          <p className="mt-3 rounded-2xl border border-rose-100 bg-white px-3 py-2 text-xs leading-5 text-rose-800">
            トリアージモードでは、各隊はこの報告を本部へ集約します。病院連絡と搬送先の振り分けは dispatch 側で行う前提です。
          </p>
        </Surface>

        <Surface eyebrow="START TRIAGE" title="START法評価" tone="triage">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-6">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">歩行</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "yes", label: "歩行可" },
                    { key: "no", label: "歩行不可" },
                  ].map((item) => (
                    <button key={item.key} type="button" onClick={() => updateStart("walking", item.key as TriageAssessment["start"]["walking"])} className={`rounded-xl px-3 py-3 text-xs font-semibold ${triageAssessment.start.walking === item.key ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200" : "bg-slate-100 text-slate-600"}`}>{item.label}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">呼吸</span>
                <select value={triageAssessment.start.respiration} onChange={(e) => updateStart("respiration", e.target.value as TriageAssessment["start"]["respiration"])} className={selectClass}>
                  <option value="">選択</option>
                  <option value="normal">10-29/分相当</option>
                  <option value="abnormal">10未満または30以上</option>
                  <option value="returns_after_airway">気道確保で呼吸再開</option>
                  <option value="absent">呼吸なし</option>
                </select>
              </div>
              <div className="col-span-12 md:col-span-6">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">循環</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "normal", label: "橈骨触知/正常" },
                    { key: "abnormal", label: "触知不可/異常" },
                  ].map((item) => (
                    <button key={item.key} type="button" onClick={() => updateStart("perfusion", item.key as TriageAssessment["start"]["perfusion"])} className={`rounded-xl px-3 py-3 text-xs font-semibold ${triageAssessment.start.perfusion === item.key ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200" : "bg-slate-100 text-slate-600"}`}>{item.label}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">意識</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "obeys", label: "従命可" },
                    { key: "not_obeys", label: "従命不可" },
                  ].map((item) => (
                    <button key={item.key} type="button" onClick={() => updateStart("mentalStatus", item.key as TriageAssessment["start"]["mentalStatus"])} className={`rounded-xl px-3 py-3 text-xs font-semibold ${triageAssessment.start.mentalStatus === item.key ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200" : "bg-slate-100 text-slate-600"}`}>{item.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/45 p-4">
              <p className="text-xs font-semibold text-rose-700">START自動判定</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {triageTagOptions.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-xl px-3 py-3 text-center text-sm font-bold ring-1 ${triageAssessment.start.tag === item.key ? item.className : "bg-white text-slate-400 ring-slate-200"}`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-rose-900">歩行、呼吸、循環、意識を入力すると自動で赤・黄・緑・黒を判定します。未入力が残る場合は判定保留です。</p>
            </div>
          </div>
        </Surface>

        <Surface eyebrow="PAT ANATOMICAL" title="解剖学的評価" tone="triage">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-2xl border border-rose-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-600">PAT自動判定</p>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${triageAssessment.anatomical.tag ? triageTagOptions.find((item) => item.key === triageAssessment.anatomical.tag)?.className : "bg-slate-50 text-slate-500 ring-slate-200"}`}>
                  {triageAssessment.anatomical.tag ? START_TRIAGE_TAG_LABELS[triageAssessment.anatomical.tag] : "保留"}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  { key: "black", label: "救命困難所見" },
                  { key: "red", label: "緊急所見あり" },
                  { key: "yellow", label: "要観察" },
                  { key: "green", label: "軽症" },
                  { key: "pending", label: "確認中" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateAnatomicalPriority(item.key as TriageAssessment["anatomical"]["priority"])}
                    className={`rounded-xl px-3 py-3 text-left text-xs font-semibold ${triageAssessment.anatomical.priority === item.key ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200" : "bg-slate-100 text-slate-600"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">PATの総合選択から黒・赤・黄・緑を自動表示します。該当所見チェックがある場合は赤として扱います。</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">該当所見</p>
              <div className="grid gap-2 md:grid-cols-2">
                {ANATOMICAL_TRIAGE_FINDINGS.map((finding) => {
                  const selected = triageAssessment.anatomical.findings.includes(finding);
                  return (
                    <button
                      key={finding}
                      type="button"
                      onClick={() => toggleAnatomicalFinding(finding)}
                      className={`rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold ${selected ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {finding}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Surface>

        <Surface eyebrow="INJURY DETAIL" title="傷病詳細" tone="triage">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">患者ごとの怪我の詳細</span>
            <textarea
              rows={5}
              value={triageAssessment.injuryDetails}
              onChange={(e) => updateInjuryDetails(e.target.value)}
              placeholder="例: 右前腕裂創 5cm、活動性出血あり、圧迫止血中。左大腿変形あり、疼痛強い。"
              className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-3 text-[13px] leading-6 text-slate-900"
            />
          </label>
        </Surface>

        <Surface eyebrow="VITALS SUPPORT" title="補助バイタル" tone="triage">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-600">START/PATを補助する数値として、現場で取れた値だけ記録します。</p>
            <button
              type="button"
              onClick={addVitalFromCurrent}
              disabled={vitals.length >= 3}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-base font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
              title="バイタル追加（最大3件）"
            >
              +
            </button>
          </div>
          <div className="mb-4 flex gap-2">
            {vitals.map((_, idx) => (
              <button
                key={`vital-tab-${idx}`}
                type="button"
                onClick={() => setActiveVitalIndex(idx)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${activeVitalIndex === idx ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {idx + 1}回目
              </button>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">時間</span>
              <input type="time" value={activeVital.measuredAt} onChange={(e) => updateVital("measuredAt", e.target.value)} className={inputClass} />
            </label>
            <label className="col-span-12 lg:col-span-5">
              <span className="mb-1 block text-xs font-semibold text-slate-600">JCS / GCS</span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={activeVital.consciousnessType}
                  onChange={(e) => {
                    const nextType = e.target.value as ConsciousnessType;
                    updateVital("consciousnessType", nextType);
                    updateVital("consciousnessValue", "");
                  }}
                  className={selectClass}
                >
                  <option value="jcs">JCS</option>
                  <option value="gcs">GCS</option>
                </select>
                {activeVital.consciousnessType === "jcs" ? (
                  <select value={activeVital.consciousnessValue} onChange={(e) => updateVital("consciousnessValue", e.target.value)} className={selectClass}>
                    <option value="">選択</option>
                    {jcsOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <select aria-label="GCS E" value={gcsParts.e} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(e.target.value, gcsParts.v, gcsParts.m))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]">
                      <option value="">E</option>
                      {gcsEOptions.map((option) => <option key={`e-${option}`} value={option}>{option}</option>)}
                    </select>
                    <select aria-label="GCS V" value={gcsParts.v} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(gcsParts.e, e.target.value, gcsParts.m))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]">
                      <option value="">V</option>
                      {gcsVOptions.map((option) => <option key={`v-${option}`} value={option}>{option}</option>)}
                    </select>
                    <select aria-label="GCS M" value={gcsParts.m} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(gcsParts.e, gcsParts.v, e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]">
                      <option value="">M</option>
                      {gcsMOptions.map((option) => <option key={`m-${option}`} value={option}>{option}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </label>
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">呼吸数</span>
              <input type="text" inputMode="numeric" value={activeVital.respiratoryRate} onChange={(e) => updateVital("respiratoryRate", extractAsciiDigits(e.target.value, 3))} className={inputClass} />
            </label>
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">脈拍数</span>
              <input type="text" inputMode="numeric" value={activeVital.pulseRate} onChange={(e) => updateVital("pulseRate", extractAsciiDigits(e.target.value, 3))} className={inputClass} />
            </label>
            <div className="col-span-12 md:col-span-6 xl:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-slate-600">血圧</span>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" inputMode="numeric" value={activeVital.bpRightSystolic} onChange={(e) => updateVital("bpRightSystolic", extractAsciiDigits(e.target.value, 3))} placeholder="収縮" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]" />
                <input type="text" inputMode="numeric" value={activeVital.bpRightDiastolic} onChange={(e) => updateVital("bpRightDiastolic", extractAsciiDigits(e.target.value, 3))} placeholder="拡張" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]" />
              </div>
            </div>
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">SpO2</span>
              <div className="relative">
                <input type="text" inputMode="numeric" value={activeVital.spo2} onChange={(e) => updateVital("spo2", extractAsciiDigits(e.target.value, 3))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
              </div>
            </label>
          </div>
        </Surface>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Surface eyebrow="DISPATCH NOTE" title="要請概要">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">要請概要</span>
          <textarea rows={4} value={dispatchSummary} onChange={(e) => setDispatchSummary(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] leading-6 text-slate-800" />
        </label>
      </Surface>

      <Surface eyebrow="CHIEF COMPLAINT" title="主訴">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">本人の主訴</span>
          <textarea rows={4} value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] leading-6 text-slate-800" />
        </label>
      </Surface>

      <Surface eyebrow="VITALS" title="基本バイタル">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">最大3件まで保持します。</p>
          <button
            type="button"
            onClick={addVitalFromCurrent}
            disabled={vitals.length >= 3}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-base font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
            title="バイタル追加（最大3件）"
          >
            +
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {vitals.map((_, idx) => (
            <button
              key={`vital-tab-${idx}`}
              type="button"
              onClick={() => setActiveVitalIndex(idx)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${activeVitalIndex === idx ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {idx + 1}回目
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-500">時間</span>
              <input type="time" value={activeVital.measuredAt} onChange={(e) => updateVital("measuredAt", e.target.value)} className={inputClass} />
            </label>
            <label className="col-span-12 lg:col-span-5">
              <span className="mb-1 block text-xs font-semibold text-slate-500">JCS / GCS</span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={activeVital.consciousnessType}
                  onChange={(e) => {
                    const nextType = e.target.value as ConsciousnessType;
                    updateVital("consciousnessType", nextType);
                    updateVital("consciousnessValue", "");
                  }}
                  className={selectClass}
                >
                  <option value="jcs">JCS</option>
                  <option value="gcs">GCS</option>
                </select>
                {activeVital.consciousnessType === "jcs" ? (
                  <select value={activeVital.consciousnessValue} onChange={(e) => updateVital("consciousnessValue", e.target.value)} className={selectClass}>
                    <option value="">選択</option>
                    {jcsOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="mb-1 grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                      <span className="text-center">E</span>
                      <span className="text-center">V</span>
                      <span className="text-center">M</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select aria-label="GCS E" value={gcsParts.e} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(e.target.value, gcsParts.v, gcsParts.m))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]">
                        <option value="">-</option>
                        {gcsEOptions.map((option) => (
                          <option key={`e-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <select aria-label="GCS V" value={gcsParts.v} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(gcsParts.e, e.target.value, gcsParts.m))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]">
                        <option value="">-</option>
                        {gcsVOptions.map((option) => (
                          <option key={`v-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <select aria-label="GCS M" value={gcsParts.m} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(gcsParts.e, gcsParts.v, e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]">
                        <option value="">-</option>
                        {gcsMOptions.map((option) => (
                          <option key={`m-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-500">呼吸数</span>
              <input type="text" inputMode="numeric" value={activeVital.respiratoryRate} onChange={(e) => updateVital("respiratoryRate", extractAsciiDigits(e.target.value, 3))} className={inputClass} />
            </label>
            <label className="col-span-12 md:col-span-5 xl:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-slate-500">異常呼吸形態</span>
              <select value={activeVital.respiratoryPattern} onChange={(e) => updateVital("respiratoryPattern", e.target.value)} className={selectClass}>
                {respiratoryPatterns.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="col-span-12 md:col-span-4 xl:col-span-3">
              <span className="mb-1 block text-xs font-semibold text-slate-500">呼気臭</span>
              <select value={activeVital.breathOdor} onChange={(e) => updateVital("breathOdor", e.target.value)} className={selectClass}>
                {breathOdors.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-500">脈拍数</span>
              <input type="text" inputMode="numeric" value={activeVital.pulseRate} onChange={(e) => updateVital("pulseRate", extractAsciiDigits(e.target.value, 3))} className={inputClass} />
            </label>
            <label className="col-span-12 md:col-span-5 xl:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-slate-500">心電図</span>
              <select value={activeVital.ecg} onChange={(e) => updateVital("ecg", e.target.value)} className={selectClass}>
                {ecgOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <div className="col-span-12 xl:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-slate-500">不整有無</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "yes", label: "あり" },
                  { key: "no", label: "なし" },
                  { key: "unknown", label: "不明" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateVital("arrhythmia", item.key as Arrhythmia)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${activeVital.arrhythmia === item.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
            <span className="mb-2 block text-xs font-semibold text-slate-500">血圧（右 / 左）</span>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">右</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" inputMode="numeric" value={activeVital.bpRightSystolic} onChange={(e) => updateVital("bpRightSystolic", extractAsciiDigits(e.target.value, 3))} placeholder="収縮" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]" />
                  <input type="text" inputMode="numeric" value={activeVital.bpRightDiastolic} onChange={(e) => updateVital("bpRightDiastolic", extractAsciiDigits(e.target.value, 3))} placeholder="拡張" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">左</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" inputMode="numeric" value={activeVital.bpLeftSystolic} onChange={(e) => updateVital("bpLeftSystolic", extractAsciiDigits(e.target.value, 3))} placeholder="収縮" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]" />
                  <input type="text" inputMode="numeric" value={activeVital.bpLeftDiastolic} onChange={(e) => updateVital("bpLeftDiastolic", extractAsciiDigits(e.target.value, 3))} placeholder="拡張" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-12 md:col-span-3 xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-500">SpO2</span>
              <div className="relative">
                <input type="text" inputMode="numeric" value={activeVital.spo2} onChange={(e) => updateVital("spo2", extractAsciiDigits(e.target.value, 3))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
            <span className="mb-2 block text-xs font-semibold text-slate-500">瞳孔（mm / 対光反射）</span>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">右</p>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" inputMode="decimal" value={activeVital.pupilRight} onChange={(e) => updateVital("pupilRight", formatPupilInput(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[13px]" />
                  <select value={activeVital.lightReflexRight} onChange={(e) => updateVital("lightReflexRight", e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[13px]">
                    {lightReflexOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <select value={activeVital.gazeRight} onChange={(e) => updateVital("gazeRight", e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[13px]">
                    {gazeOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">左</p>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" inputMode="decimal" value={activeVital.pupilLeft} onChange={(e) => updateVital("pupilLeft", formatPupilInput(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[13px]" />
                  <select value={activeVital.lightReflexLeft} onChange={(e) => updateVital("lightReflexLeft", e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[13px]">
                    {lightReflexOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <select value={activeVital.gazeLeft} onChange={(e) => updateVital("gazeLeft", e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[13px]">
                    {gazeOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4 xl:col-span-3">
              <span className="mb-1 block text-xs font-semibold text-slate-500">体温</span>
              <input type="text" inputMode="decimal" value={activeVital.temperature} disabled={activeVital.temperatureUnavailable} onChange={(e) => updateVital("temperature", formatTemperatureInput(e.target.value))} className={inputClass} />
              <button
                type="button"
                onClick={() => {
                  const next = !activeVital.temperatureUnavailable;
                  updateVital("temperatureUnavailable", next);
                  if (next) updateVital("temperature", "");
                }}
                className={`mt-2 w-full rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeVital.temperatureUnavailable ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {activeVital.temperatureUnavailable ? "測定不能" : "数値入力"}
              </button>
            </div>
          </div>
        </div>
      </Surface>
    </section>
  );
}
