"use client";

import { extractAsciiDigits } from "@/lib/inputDigits";



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

  dispatchSummary: string;

  chiefComplaint: string;

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



export function CaseFormVitalsTab({

  dispatchSummary,

  chiefComplaint,

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

}: CaseFormVitalsTabProps) {

  return (

    <section className="space-y-4">

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.45)]">

        <h2 className="text-xs font-bold text-slate-800">要請概要</h2>

        <textarea rows={4} value={dispatchSummary} onChange={(e) => setDispatchSummary(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />

      </div>



      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.45)]">

        <h2 className="text-xs font-bold text-slate-800">本人の主訴</h2>

        <textarea rows={4} value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />

      </div>



      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.45)]">

        <div className="mb-3 flex items-center justify-between">

          <h2 className="text-xs font-bold text-slate-800">基本バイタル</h2>

          <button

            type="button"

            onClick={addVitalFromCurrent}

            disabled={vitals.length >= 3}

            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"

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

              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${activeVitalIndex === idx ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}

            >

              {idx + 1}回目

            </button>

          ))}

        </div>



        <div className="space-y-4">

          <div className="grid grid-cols-12 gap-3">

            <label className="col-span-3">

              <span className="mb-1 block text-xs font-semibold text-slate-500">時間</span>

              <input type="time" value={activeVital.measuredAt} onChange={(e) => updateVital("measuredAt", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />

            </label>

          </div>



          <div className="grid grid-cols-12 gap-3">

            <label className="col-span-4">

              <span className="mb-1 block text-xs font-semibold text-slate-500">JCS / GCS</span>

              <div className="grid grid-cols-2 gap-2">

                <select

                  value={activeVital.consciousnessType}

                  onChange={(e) => {

                    const nextType = e.target.value as ConsciousnessType;

                    updateVital("consciousnessType", nextType);

                    updateVital("consciousnessValue", "");

                  }}

                  className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]"

                >

                  <option value="jcs">JCS</option>

                  <option value="gcs">GCS</option>

                </select>

                {activeVital.consciousnessType === "jcs" ? (

                  <select value={activeVital.consciousnessValue} onChange={(e) => updateVital("consciousnessValue", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">

                    <option value="">選択</option>

                    {jcsOptions.map((option) => (

                      <option key={option} value={option}>

                        {option}

                      </option>

                    ))}

                  </select>

                ) : (

                  <div className="col-span-1 rounded-lg border border-slate-200 p-2">

                    <div className="mb-1 grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">

                      <span className="text-center">E</span>

                      <span className="text-center">V</span>

                      <span className="text-center">M</span>

                    </div>

                    <div className="grid grid-cols-3 gap-2">

                      <select aria-label="GCS E" value={gcsParts.e} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(e.target.value, gcsParts.v, gcsParts.m))} className="rounded-md border border-slate-200 px-2 py-2 text-[13px]">

                        <option value="">-</option>

                        {gcsEOptions.map((option) => (

                          <option key={`e-${option}`} value={option}>

                            {option}

                          </option>

                        ))}

                      </select>

                      <select aria-label="GCS V" value={gcsParts.v} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(gcsParts.e, e.target.value, gcsParts.m))} className="rounded-md border border-slate-200 px-2 py-2 text-[13px]">

                        <option value="">-</option>

                        {gcsVOptions.map((option) => (

                          <option key={`v-${option}`} value={option}>

                            {option}

                          </option>

                        ))}

                      </select>

                      <select aria-label="GCS M" value={gcsParts.m} onChange={(e) => updateVital("consciousnessValue", composeGcsValue(gcsParts.e, gcsParts.v, e.target.value))} className="rounded-md border border-slate-200 px-2 py-2 text-[13px]">

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

            <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">呼吸数</span><input type="text" inputMode="numeric" value={activeVital.respiratoryRate} onChange={(e) => updateVital("respiratoryRate", extractAsciiDigits(e.target.value, 3))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" /></label>

            <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">異常呼吸形態</span><select value={activeVital.respiratoryPattern} onChange={(e) => updateVital("respiratoryPattern", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{respiratoryPatterns.map((option) => <option key={option}>{option}</option>)}</select></label>

            <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">呼気臭</span><select value={activeVital.breathOdor} onChange={(e) => updateVital("breathOdor", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{breathOdors.map((option) => <option key={option}>{option}</option>)}</select></label>

          </div>



          <div className="grid grid-cols-12 gap-3">

            <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">脈拍数</span><input type="text" inputMode="numeric" value={activeVital.pulseRate} onChange={(e) => updateVital("pulseRate", extractAsciiDigits(e.target.value, 3))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" /></label>

            <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">心電図</span><select value={activeVital.ecg} onChange={(e) => updateVital("ecg", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">{ecgOptions.map((option) => <option key={option}>{option}</option>)}</select></label>

            <div className="col-span-4">

              <span className="mb-1 block text-xs font-semibold text-slate-500">不整有無</span>

              <div className="flex gap-2">

                {[

                  { key: "yes", label: "あり" },

                  { key: "no", label: "なし" },

                  { key: "unknown", label: "不明" },

                ].map((item) => (

                  <button

                    key={item.key}

                    type="button"

                    onClick={() => updateVital("arrhythmia", item.key as Arrhythmia)}

                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeVital.arrhythmia === item.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}

                  >

                    {item.label}

                  </button>

                ))}

              </div>

            </div>

          </div>



          <div className="grid grid-cols-12 gap-3">

            <div className="col-span-8 rounded-lg border border-slate-200 p-2.5">

              <span className="mb-2 block text-xs font-semibold text-slate-500">血圧（右 / 左）</span>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <p className="mb-1 text-[11px] font-semibold text-slate-500">右</p>

                  <div className="grid grid-cols-2 gap-2">

                    <input type="text" inputMode="numeric" value={activeVital.bpRightSystolic} onChange={(e) => updateVital("bpRightSystolic", extractAsciiDigits(e.target.value, 3))} placeholder="収縮" className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]" />

                    <input type="text" inputMode="numeric" value={activeVital.bpRightDiastolic} onChange={(e) => updateVital("bpRightDiastolic", extractAsciiDigits(e.target.value, 3))} placeholder="拡張" className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]" />

                  </div>

                </div>

                <div>

                  <p className="mb-1 text-[11px] font-semibold text-slate-500">左</p>

                  <div className="grid grid-cols-2 gap-2">

                    <input type="text" inputMode="numeric" value={activeVital.bpLeftSystolic} onChange={(e) => updateVital("bpLeftSystolic", extractAsciiDigits(e.target.value, 3))} placeholder="収縮" className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]" />

                    <input type="text" inputMode="numeric" value={activeVital.bpLeftDiastolic} onChange={(e) => updateVital("bpLeftDiastolic", extractAsciiDigits(e.target.value, 3))} placeholder="拡張" className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]" />

                  </div>

                </div>

              </div>

            </div>

          </div>



          <div className="grid grid-cols-12 gap-3">

            <label className="col-span-2">

              <span className="mb-1 block text-xs font-semibold text-slate-500">SpO2</span>

              <div className="relative">

                <input type="text" inputMode="numeric" value={activeVital.spo2} onChange={(e) => updateVital("spo2", extractAsciiDigits(e.target.value, 3))} className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>

              </div>

            </label>

          </div>



          <div className="grid grid-cols-12 gap-3">

            <div className="col-span-8 rounded-lg border border-slate-200 p-2.5">

              <span className="mb-2 block text-xs font-semibold text-slate-500">瞳孔（mm / 対光反射）</span>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <p className="mb-1 text-[11px] font-semibold text-slate-500">右</p>

                  <div className="grid grid-cols-3 gap-2">

                    <input type="text" inputMode="decimal" value={activeVital.pupilRight} onChange={(e) => updateVital("pupilRight", formatPupilInput(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]" />

                    <select value={activeVital.lightReflexRight} onChange={(e) => updateVital("lightReflexRight", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]">{lightReflexOptions.map((option) => <option key={option}>{option}</option>)}</select>

                    <select value={activeVital.gazeRight} onChange={(e) => updateVital("gazeRight", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]">{gazeOptions.map((option) => <option key={option}>{option}</option>)}</select>

                  </div>

                </div>

                <div>

                  <p className="mb-1 text-[11px] font-semibold text-slate-500">左</p>

                  <div className="grid grid-cols-3 gap-2">

                    <input type="text" inputMode="decimal" value={activeVital.pupilLeft} onChange={(e) => updateVital("pupilLeft", formatPupilInput(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]" />

                    <select value={activeVital.lightReflexLeft} onChange={(e) => updateVital("lightReflexLeft", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]">{lightReflexOptions.map((option) => <option key={option}>{option}</option>)}</select>

                    <select value={activeVital.gazeLeft} onChange={(e) => updateVital("gazeLeft", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]">{gazeOptions.map((option) => <option key={option}>{option}</option>)}</select>

                  </div>

                </div>

              </div>

            </div>

          </div>



          <div className="grid grid-cols-12 gap-3">

            <div className="col-span-3">

              <span className="mb-1 block text-xs font-semibold text-slate-500">体温</span>

              <input type="text" inputMode="decimal" value={activeVital.temperature} disabled={activeVital.temperatureUnavailable} onChange={(e) => updateVital("temperature", formatTemperatureInput(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] disabled:bg-slate-100" />

              <button

                type="button"

                onClick={() => {

                  const next = !activeVital.temperatureUnavailable;

                  updateVital("temperatureUnavailable", next);

                  if (next) updateVital("temperature", "");

                }}

                className={`mt-2 w-full rounded-lg px-2 py-1.5 text-xs font-semibold ${activeVital.temperatureUnavailable ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}

              >

                {activeVital.temperatureUnavailable ? "測定不能" : "数値入力"}

              </button>

            </div>

          </div>

        </div>

      </div>



    </section>

  );

}
