"use client";

import type { ReactNode, RefObject } from "react";

import { extractAsciiDigits } from "@/lib/inputDigits";

type BirthType = "western" | "japanese";
type Era = "reiwa" | "heisei" | "showa";
type Gender = "male" | "female" | "unknown";
type DnarOption = "" | "full_code" | "dnar" | "other";
type AgeMode = "auto" | "unknown" | "estimated";

type RelatedPerson = {
  name: string;
  relation: string;
  phone: string;
};

type PastHistory = {
  disease: string;
  clinic: string;
};

type CaseFormBasicTabProps = {
  name: string;
  nameUnknown: boolean;
  setName: (value: string) => void;
  setNameUnknown: (value: boolean) => void;
  gender: Gender;
  setGender: (value: Gender) => void;
  birthType: BirthType;
  setBirthType: (value: BirthType) => void;
  birthWesternYear: string;
  setBirthWesternYear: (value: string) => void;
  birthWesternMonth: string;
  setBirthWesternMonth: (value: string) => void;
  birthWesternDay: string;
  setBirthWesternDay: (value: string) => void;
  setBirthDateWestern: (value: string) => void;
  birthEra: Era;
  setBirthEra: (value: Era) => void;
  birthEraYear: string;
  setBirthEraYear: (value: string) => void;
  birthMonth: string;
  setBirthMonth: (value: string) => void;
  birthDay: string;
  setBirthDay: (value: string) => void;
  westernMonthRef: RefObject<HTMLInputElement | null>;
  westernDayRef: RefObject<HTMLInputElement | null>;
  age: string;
  ageMode: AgeMode;
  setAgeMode: (value: AgeMode) => void;
  estimatedAge: string;
  setEstimatedAge: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  formatPhone: (value: string) => string;
  adl: string;
  setAdl: (value: string) => void;
  adlOptions: string[];
  dnarOption: DnarOption;
  setDnarOption: (value: DnarOption) => void;
  dnarOther: string;
  setDnarOther: (value: string) => void;
  allergy: string;
  setAllergy: (value: string) => void;
  weight: string;
  setWeight: (value: string) => void;
  formatWeightInput: (value: string) => string;
  relatedPeople: RelatedPerson[];
  setRelatedPeople: (updater: (prev: RelatedPerson[]) => RelatedPerson[]) => void;
  pastHistories: PastHistory[];
  renderPastHistoryRow: (entry: PastHistory, index: number) => ReactNode;
  specialNote: string;
  setSpecialNote: (value: string) => void;
};

function Surface({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-blue-100/80 bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
      <div className="mb-4">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">{eyebrow}</p>
        <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100";
const selectClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900";

export function CaseFormBasicTab(props: CaseFormBasicTabProps) {
  const {
    name,
    nameUnknown,
    setName,
    setNameUnknown,
    gender,
    setGender,
    birthType,
    setBirthType,
    birthWesternYear,
    setBirthWesternYear,
    birthWesternMonth,
    setBirthWesternMonth,
    birthWesternDay,
    setBirthWesternDay,
    setBirthDateWestern,
    birthEra,
    setBirthEra,
    birthEraYear,
    setBirthEraYear,
    birthMonth,
    setBirthMonth,
    birthDay,
    setBirthDay,
    westernMonthRef,
    westernDayRef,
    age,
    ageMode,
    setAgeMode,
    estimatedAge,
    setEstimatedAge,
    address,
    setAddress,
    phone,
    setPhone,
    formatPhone,
    adl,
    setAdl,
    adlOptions,
    dnarOption,
    setDnarOption,
    dnarOther,
    setDnarOther,
    allergy,
    setAllergy,
    weight,
    setWeight,
    formatWeightInput,
    relatedPeople,
    setRelatedPeople,
    pastHistories,
    renderPastHistoryRow,
    specialNote,
    setSpecialNote,
  } = props;

  return (
    <section className="space-y-4">
      <Surface eyebrow="BASIC INFO" title="患者基本情報">
        <div className="grid grid-cols-12 gap-3">
          <label className="col-span-12 lg:col-span-3">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>氏名</span>
              <button
                type="button"
                onClick={() => {
                  const next = !nameUnknown;
                  setNameUnknown(next);
                  if (next) setName("");
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${nameUnknown ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
              >
                不明 {nameUnknown ? "ON" : "OFF"}
              </button>
            </span>
            <input value={name} disabled={nameUnknown} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>

          <div className="col-span-12 lg:col-span-3">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">性別</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "male", label: "男性" },
                { key: "female", label: "女性" },
                { key: "unknown", label: "不明" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGender(item.key as Gender)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${gender === item.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">生年月日</span>
            {birthType === "western" ? (
              <div className="grid grid-cols-12 gap-2">
                <select value={birthType} onChange={(e) => setBirthType(e.target.value as BirthType)} className={`col-span-4 ${selectClass}`}>
                  <option value="western">西暦</option>
                  <option value="japanese">和暦</option>
                </select>
                <div className="col-span-8 grid grid-cols-3 gap-2">
                  <input
                    value={birthWesternYear}
                    onChange={(e) => {
                      const next = extractAsciiDigits(e.target.value, 4);
                      setBirthWesternYear(next);
                      setBirthDateWestern(next.length === 4 && birthWesternMonth.length === 2 && birthWesternDay.length === 2 ? `${next}-${birthWesternMonth}-${birthWesternDay}` : "");
                      if (next.length >= 4) westernMonthRef.current?.focus();
                    }}
                    placeholder="YYYY"
                    className={inputClass}
                  />
                  <input
                    ref={westernMonthRef}
                    value={birthWesternMonth}
                    onChange={(e) => {
                      const next = extractAsciiDigits(e.target.value, 2);
                      setBirthWesternMonth(next);
                      setBirthDateWestern(birthWesternYear.length === 4 && next.length === 2 && birthWesternDay.length === 2 ? `${birthWesternYear}-${next}-${birthWesternDay}` : "");
                      if (next.length >= 2) westernDayRef.current?.focus();
                    }}
                    placeholder="MM"
                    className={inputClass}
                  />
                  <input
                    ref={westernDayRef}
                    value={birthWesternDay}
                    onChange={(e) => {
                      const next = extractAsciiDigits(e.target.value, 2);
                      setBirthWesternDay(next);
                      setBirthDateWestern(birthWesternYear.length === 4 && birthWesternMonth.length === 2 && next.length === 2 ? `${birthWesternYear}-${birthWesternMonth}-${next}` : "");
                    }}
                    placeholder="DD"
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2">
                <select value={birthType} onChange={(e) => setBirthType(e.target.value as BirthType)} className={`col-span-3 ${selectClass}`}>
                  <option value="western">西暦</option>
                  <option value="japanese">和暦</option>
                </select>
                <select value={birthEra} onChange={(e) => setBirthEra(e.target.value as Era)} className={`col-span-3 ${selectClass}`}>
                  <option value="reiwa">令和</option>
                  <option value="heisei">平成</option>
                  <option value="showa">昭和</option>
                </select>
                <input value={birthEraYear} onChange={(e) => setBirthEraYear(extractAsciiDigits(e.target.value, 2))} placeholder="年" className={`col-span-2 ${inputClass}`} />
                <input value={birthMonth} onChange={(e) => setBirthMonth(extractAsciiDigits(e.target.value, 2))} placeholder="月" className={`col-span-2 ${inputClass}`} />
                <input value={birthDay} onChange={(e) => setBirthDay(extractAsciiDigits(e.target.value, 2))} placeholder="日" className={`col-span-2 ${inputClass}`} />
              </div>
            )}
          </div>

          <label className="col-span-12 lg:col-span-2">
            <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
              <span>年齢</span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAgeMode(ageMode === "unknown" ? "auto" : "unknown")}
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${ageMode === "unknown" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                >
                  不明
                </button>
                <button
                  type="button"
                  onClick={() => setAgeMode(ageMode === "estimated" ? "auto" : "estimated")}
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${ageMode === "estimated" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                >
                  推定
                </button>
              </span>
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={ageMode === "estimated" ? estimatedAge : age}
              readOnly={ageMode !== "estimated"}
              disabled={ageMode === "unknown"}
              placeholder={ageMode === "unknown" ? "不明" : "年齢"}
              onChange={(e) => setEstimatedAge(extractAsciiDigits(e.target.value, 3))}
              className={`w-full rounded-xl px-3 py-2.5 text-sm ${ageMode === "estimated" ? "bg-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.22)]" : "bg-slate-100"} disabled:bg-slate-100`}
            />
          </label>

          <label className="col-span-12 lg:col-span-8">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">住所</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </label>

          <label className="col-span-12 lg:col-span-4">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">電話番号</span>
            <input type="text" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className={inputClass} />
          </label>

          <label className="col-span-12 lg:col-span-3">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">ADL</span>
            <select value={adl} onChange={(e) => setAdl(e.target.value)} className={selectClass}>
              <option value="">選択</option>
              {adlOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="col-span-12 lg:col-span-9">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">DNAR</span>
            <div className="grid grid-cols-12 gap-2">
              <select value={dnarOption} onChange={(e) => setDnarOption(e.target.value as DnarOption)} className={`col-span-12 lg:col-span-3 ${selectClass}`}>
                <option value="">選択</option>
                <option value="full_code">フルコード</option>
                <option value="dnar">DNAR</option>
                <option value="other">その他自由記載</option>
              </select>
              <input value={dnarOther} onChange={(e) => setDnarOther(e.target.value)} disabled={dnarOption !== "other"} placeholder="その他内容" className={`col-span-12 lg:col-span-9 ${inputClass}`} />
            </div>
          </div>

          <label className="col-span-12 lg:col-span-6">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">アレルギー</span>
            <input value={allergy} onChange={(e) => setAllergy(e.target.value)} className={inputClass} />
          </label>

          <label className="col-span-12 lg:col-span-3">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">体重(kg)</span>
            <input type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(formatWeightInput(e.target.value))} className={inputClass} />
          </label>
        </div>
      </Surface>

      <Surface eyebrow="CONTACTS" title="関係者">
        <div className="grid grid-cols-1 gap-3">
          {relatedPeople.map((person, idx) => (
            <div key={`related-person-${idx}`} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="mb-2 text-xs font-semibold text-slate-500">関係者 {idx + 1}</p>
              <div className="grid grid-cols-12 gap-3">
                <label className="col-span-12 lg:col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">氏名</span>
                  <input
                    value={person.name}
                    onChange={(e) => setRelatedPeople((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="col-span-12 lg:col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">関係性</span>
                  <input
                    value={person.relation}
                    onChange={(e) => setRelatedPeople((prev) => prev.map((item, i) => (i === idx ? { ...item, relation: e.target.value } : item)))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="col-span-12 lg:col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">電話番号</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={person.phone}
                    onChange={(e) => setRelatedPeople((prev) => prev.map((item, i) => (i === idx ? { ...item, phone: formatPhone(e.target.value) } : item)))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </Surface>

      <Surface eyebrow="HISTORY" title="既往歴・かかりつけ">
        <div className="grid grid-cols-1 gap-3">
          {pastHistories.map((entry, idx) => renderPastHistoryRow(entry, idx))}
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">特記（個別に伝える内容）</span>
          <textarea rows={6} value={specialNote} onChange={(e) => setSpecialNote(e.target.value)} placeholder="病院へ個別に伝える補足内容を記載" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" />
        </label>
      </Surface>
    </section>
  );
}
