"use client";

import type { RefObject, ReactNode } from "react";

type BirthType = "western" | "japanese";
type Era = "reiwa" | "heisei" | "showa";
type Gender = "male" | "female" | "unknown";
type DnarOption = "" | "full_code" | "dnar" | "other";

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
  relatedPeople: RelatedPerson[];
  setRelatedPeople: (updater: (prev: RelatedPerson[]) => RelatedPerson[]) => void;
  pastHistories: PastHistory[];
  renderPastHistoryRow: (entry: PastHistory, index: number) => ReactNode;
  specialNote: string;
  setSpecialNote: (value: string) => void;
};

export function CaseFormBasicTab({
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
  relatedPeople,
  setRelatedPeople,
  pastHistories,
  renderPastHistoryRow,
  specialNote,
  setSpecialNote,
}: CaseFormBasicTabProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">基本情報</h2>
        <div className="mt-4 grid grid-cols-12 gap-4">
          <label className="col-span-3">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>氏名</span>
              <button
                type="button"
                onClick={() => {
                  const next = !nameUnknown;
                  setNameUnknown(next);
                  if (next) setName("");
                }}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${nameUnknown ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
              >
                不明 {nameUnknown ? "ON" : "OFF"}
              </button>
            </span>
            <input value={name} disabled={nameUnknown} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100" />
          </label>
          <div className="col-span-3">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">性別</span>
            <div className="flex gap-2">
              {[
                { key: "male", label: "男性" },
                { key: "female", label: "女性" },
                { key: "unknown", label: "不明" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGender(item.key as Gender)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${gender === item.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-4">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">生年月日</span>
            {birthType === "western" ? (
              <div className="grid grid-cols-12 gap-2">
                <select value={birthType} onChange={(e) => setBirthType(e.target.value as BirthType)} className="col-span-4 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="western">西暦</option>
                  <option value="japanese">和暦</option>
                </select>
                <div className="col-span-8 grid grid-cols-3 gap-2">
                  <input
                    value={birthWesternYear}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setBirthWesternYear(next);
                      setBirthDateWestern(
                        next.length === 4 && birthWesternMonth.length === 2 && birthWesternDay.length === 2
                          ? `${next}-${birthWesternMonth}-${birthWesternDay}`
                          : "",
                      );
                      if (next.length >= 4) {
                        westernMonthRef.current?.focus();
                      }
                    }}
                    placeholder="YYYY"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    ref={westernMonthRef}
                    value={birthWesternMonth}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setBirthWesternMonth(next);
                      setBirthDateWestern(
                        birthWesternYear.length === 4 && next.length === 2 && birthWesternDay.length === 2
                          ? `${birthWesternYear}-${next}-${birthWesternDay}`
                          : "",
                      );
                      if (next.length >= 2) {
                        westernDayRef.current?.focus();
                      }
                    }}
                    placeholder="MM"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    ref={westernDayRef}
                    value={birthWesternDay}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setBirthWesternDay(next);
                      setBirthDateWestern(
                        birthWesternYear.length === 4 && birthWesternMonth.length === 2 && next.length === 2
                          ? `${birthWesternYear}-${birthWesternMonth}-${next}`
                          : "",
                      );
                    }}
                    placeholder="DD"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2">
                <select value={birthType} onChange={(e) => setBirthType(e.target.value as BirthType)} className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="western">西暦</option>
                  <option value="japanese">和暦</option>
                </select>
                <select value={birthEra} onChange={(e) => setBirthEra(e.target.value as Era)} className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="reiwa">令和</option>
                  <option value="heisei">平成</option>
                  <option value="showa">昭和</option>
                </select>
                <input value={birthEraYear} onChange={(e) => setBirthEraYear(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="年" className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={birthMonth} onChange={(e) => setBirthMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="月" className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={birthDay} onChange={(e) => setBirthDay(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="日" className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            )}
          </div>

          <label className="col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">年齢</span>
            <input value={age} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm" />
          </label>

          <label className="col-span-8">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">住所</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="col-span-4">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">電話番号</span>
            <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>

          <label className="col-span-3">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">ADL</span>
            <select value={adl} onChange={(e) => setAdl(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">選択</option>
              {adlOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-9">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">DNAR</span>
            <div className="grid grid-cols-12 gap-2">
              <select value={dnarOption} onChange={(e) => setDnarOption(e.target.value as DnarOption)} className="col-span-3 h-[42px] rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">選択</option>
                <option value="full_code">フルコード</option>
                <option value="dnar">DNAR</option>
                <option value="other">その他自由記載</option>
              </select>
              <input value={dnarOther} onChange={(e) => setDnarOther(e.target.value)} disabled={dnarOption !== "other"} placeholder="その他内容" className="col-span-9 h-[42px] rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100" />
            </div>
          </div>
          <label className="col-span-6">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">アレルギー</span>
            <input value={allergy} onChange={(e) => setAllergy(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="col-span-3">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">体重(kg)</span>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">関係者</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {relatedPeople.map((person, idx) => (
            <div key={`related-person-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">関係者 {idx + 1}</p>
              <div className="grid grid-cols-12 gap-3">
                <label className="col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">氏名</span>
                  <input
                    value={person.name}
                    onChange={(e) =>
                      setRelatedPeople((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">関係性</span>
                  <input
                    value={person.relation}
                    onChange={(e) =>
                      setRelatedPeople((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, relation: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">電話番号</span>
                  <input
                    value={person.phone}
                    onChange={(e) =>
                      setRelatedPeople((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, phone: formatPhone(e.target.value) } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">既往歴・かかりつけ</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {pastHistories.map((entry, idx) => renderPastHistoryRow(entry, idx))}
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">特記（個別に伝える内容）</span>
          <textarea rows={6} value={specialNote} onChange={(e) => setSpecialNote(e.target.value)} placeholder="病院へ個別に伝える補足内容を記載" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>
    </section>
  );
}
