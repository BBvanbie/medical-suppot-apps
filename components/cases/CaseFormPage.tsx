"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";
import type { CaseRecord } from "@/lib/mockCases";

type CaseFormPageProps = {
  mode: "create" | "edit";
  initialCase?: CaseRecord;
};

type TabId = "basic" | "vitals" | "history";
type Gender = "male" | "female" | "unknown";
type BirthType = "western" | "japanese";
type Era = "令和" | "平成" | "昭和";

type PastHistory = {
  disease: string;
  clinic: string;
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "basic", label: "基本情報" },
  { id: "vitals", label: "概要・バイタル" },
  { id: "history", label: "送信履歴" },
];

const ADL_OPTIONS = ["要支援1", "要支援2", "要介護1", "要介護2", "要介護3", "要介護4", "要介護5"];

function toGregorianDate(era: Era, eraYear: number, month: number, day: number): Date | null {
  if (!eraYear || !month || !day) return null;
  const base: Record<Era, number> = { 令和: 2018, 平成: 1988, 昭和: 1925 };
  const date = new Date(base[era] + eraYear, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calcAge(date: Date | null) {
  if (!date) return "";
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 ? String(age) : "";
}

function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
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
      <p className="mb-2 text-xs font-semibold text-slate-500">既往症 {index + 1}</p>
      <div className="grid grid-cols-12 gap-3">
        <label className="col-span-5">
          <span className="mb-1 block text-[11px] font-semibold text-slate-500">病名</span>
          <input
            value={value.disease}
            onChange={(e) => onChange({ ...value, disease: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="例: 高血圧"
          />
        </label>
        <label className="col-span-7 relative">
          <span className="mb-1 block text-[11px] font-semibold text-slate-500">かかりつけ</span>
          <input
            value={value.clinic}
            onChange={(e) => {
              onChange({ ...value, clinic: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="病院名を入力（自由入力可）"
          />
          {showSuggestions && value.clinic.trim().length > 0 && suggestions.length > 0 && (
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
                    onClick={() => {
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
          )}
        </label>
      </div>
    </div>
  );
}

export function CaseFormPage({ mode, initialCase }: CaseFormPageProps) {
  const isCreate = mode === "create";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  const [name, setName] = useState(initialCase?.name ?? "");
  const [nameUnknown, setNameUnknown] = useState(false);
  const [gender, setGender] = useState<Gender>("unknown");

  const [birthType, setBirthType] = useState<BirthType>("western");
  const [birthDateWestern, setBirthDateWestern] = useState("");
  const [birthEra, setBirthEra] = useState<Era>("令和");
  const [birthEraYear, setBirthEraYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  const [address, setAddress] = useState(initialCase?.address ?? "");
  const [phone, setPhone] = useState("");
  const [adl, setAdl] = useState("要介護1");
  const [allergy, setAllergy] = useState("");
  const [weight, setWeight] = useState("");

  const [pastHistories, setPastHistories] = useState<PastHistory[]>(
    Array.from({ length: 6 }).map(() => ({ disease: "", clinic: "" })),
  );

  const birthDate = useMemo(() => {
    if (birthType === "western") {
      if (!birthDateWestern) return null;
      const d = new Date(birthDateWestern);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return toGregorianDate(birthEra, Number(birthEraYear), Number(birthMonth), Number(birthDay));
  }, [birthType, birthDateWestern, birthEra, birthEraYear, birthMonth, birthDay]);

  const age = calcAge(birthDate);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="min-w-0 flex-1 overflow-auto px-8 py-6">
          <div className="mx-auto w-full max-w-[1320px]">
            <header className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">CASE MANAGEMENT</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {isCreate ? "事案情報作成" : "事案情報"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                  ホームへ戻る
                </Link>
                <button type="button" className="inline-flex items-center rounded-xl bg-[var(--accent-blue)] px-4 py-2 text-xs font-semibold text-white">
                  保存
                </button>
              </div>
            </header>

            <div className="mb-4 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    activeTab === tab.id ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "basic" && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-800">基本情報</h2>
                  <div className="mt-4 grid grid-cols-12 gap-4">
                    <label className="col-span-5">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">氏名</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={nameUnknown}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    </label>
                    <div className="col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">氏名不明</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !nameUnknown;
                          setNameUnknown(next);
                          if (next) setName("");
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${nameUnknown ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        {nameUnknown ? "ON" : "OFF"}
                      </button>
                    </div>
                    <div className="col-span-5">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">性別</span>
                      <div className="flex gap-2">
                        {[
                          { key: "male", label: "男性" },
                          { key: "female", label: "女性" },
                          { key: "unknown", label: "不明" },
                        ].map((g) => (
                          <button
                            key={g.key}
                            type="button"
                            onClick={() => setGender(g.key as Gender)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${gender === g.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-7">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">生年月日</span>
                      <div className="mb-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBirthType("western")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${birthType === "western" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          西暦
                        </button>
                        <button
                          type="button"
                          onClick={() => setBirthType("japanese")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${birthType === "japanese" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          和暦
                        </button>
                      </div>
                      {birthType === "western" ? (
                        <input
                          type="date"
                          value={birthDateWestern}
                          onChange={(e) => setBirthDateWestern(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      ) : (
                        <div className="grid grid-cols-12 gap-2">
                          <select value={birthEra} onChange={(e) => setBirthEra(e.target.value as Era)} className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <option value="令和">令和</option>
                            <option value="平成">平成</option>
                            <option value="昭和">昭和</option>
                          </select>
                          <input value={birthEraYear} onChange={(e) => setBirthEraYear(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="年" className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          <input value={birthMonth} onChange={(e) => setBirthMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="月" className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          <input value={birthDay} onChange={(e) => setBirthDay(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="日" className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </div>
                      )}
                    </div>
                    <label className="col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">年齢</span>
                      <input value={age} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm" />
                    </label>
                    <label className="col-span-7">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">住所</span>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="col-span-3">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">電話番号</span>
                      <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="col-span-3">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">ADL</span>
                      <select value={adl} onChange={(e) => setAdl(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        {ADL_OPTIONS.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label className="col-span-4">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">アレルギー</span>
                      <input value={allergy} onChange={(e) => setAllergy(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">体重(kg)</span>
                      <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-800">既往症・かかりつけ</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {pastHistories.map((entry, idx) => (
                      <PastHistoryRow
                        key={`history-row-${idx}`}
                        index={idx}
                        value={entry}
                        onChange={(next) => setPastHistories((prev) => prev.map((v, i) => (i === idx ? next : v)))}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "vitals" && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-800">要請概要</h2>
                  <textarea rows={4} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="要請概要を入力" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-800">本人主訴</h2>
                  <textarea rows={4} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="本人主訴を入力" />
                </div>
              </section>
            )}

            {activeTab === "history" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-800">送信履歴</h2>
                <p className="mt-2 text-sm text-slate-500">次工程で実装します。</p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
