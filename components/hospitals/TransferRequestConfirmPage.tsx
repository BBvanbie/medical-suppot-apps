"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";

type VitalSet = {
  measuredAt: string;
  consciousnessType: "jcs" | "gcs";
  consciousnessValue: string;
  respiratoryRate: string;
  pulseRate: string;
  spo2: string;
  temperature: string;
  temperatureUnavailable: boolean;
};

type CaseContext = {
  caseId: string;
  name: string;
  age: string;
  address: string;
  phone?: string;
  gender?: string;
  birthSummary?: string;
  adl?: string;
  allergy?: string;
  weight?: string;
  relatedPeople?: Array<{ name: string; relation: string; phone: string }>;
  pastHistories?: Array<{ disease: string; clinic: string }>;
  chiefComplaint: string;
  dispatchSummary: string;
  vitals?: VitalSet[];
  changedFindings?: Array<{ major: string; middle: string; detail: string }>;
  updatedAt: string;
};

type RequestHospital = {
  hospitalId: number;
  hospitalName: string;
  address: string;
  phone: string;
  departments: string[];
  distanceKm: number | null;
};

type TransferRequestDraft = {
  requestId: string;
  caseId: string;
  createdAt: string;
  caseContext: CaseContext | null;
  searchMode: "or" | "and";
  selectedDepartments: string[];
  hospitals: RequestHospital[];
};

type SentHistoryItem = {
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: "未読" | "既読" | "受入可能" | "搬送決定" | "辞退";
  hospitalCount: number;
  hospitalNames: string[];
  searchMode?: "or" | "and";
  selectedDepartments?: string[];
};

const FINDING_MAJOR_ORDER = ["神経所見", "循環器所見", "呼吸器所見", "消化器所見", "外傷所見"] as const;

function asSummaryValue(value: unknown) {
  if (value === null || value === undefined) return "未入力";
  if (typeof value === "string") return value.trim() ? value : "未入力";
  return String(value);
}

export function TransferRequestConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<TransferRequestDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    try {
      const directKey = requestId ? `hospital-request:${requestId}` : "";
      const activeKey = sessionStorage.getItem("active-hospital-request-key") ?? "";
      const raw =
        (directKey ? sessionStorage.getItem(directKey) : null) ??
        (activeKey ? sessionStorage.getItem(activeKey) : null);
      if (!raw) {
        setDraft(null);
        setLoading(false);
        return;
      }
      setDraft(JSON.parse(raw) as TransferRequestDraft);
    } catch {
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const caseId = draft?.caseId ?? "";
  const context = draft?.caseContext;
  const canSend = Boolean(draft && draft.hospitals.length > 0);
  const vitals = context?.vitals ?? [];
  const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const changedFindings = useMemo(() => context?.changedFindings ?? [], [context?.changedFindings]);

  const createdAtLabel = useMemo(() => {
    if (!draft?.createdAt) return "-";
    const d = new Date(draft.createdAt);
    if (Number.isNaN(d.getTime())) return draft.createdAt;
    return d.toLocaleString("ja-JP");
  }, [draft?.createdAt]);

  const findingCounts = useMemo(() => {
    return FINDING_MAJOR_ORDER.map((major) => ({
      major,
      count: changedFindings.filter((item) => item.major === major).length,
    }));
  }, [changedFindings]);

  const handleSend = async () => {
    if (!draft || !canSend || submitting) return;
    setSubmitting(true);
    const payload = {
      ...draft,
      sentAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem(`hospital-request-sent:${draft.requestId}`, JSON.stringify(payload));
      const historyRaw = sessionStorage.getItem("hospital-request-history");
      const history = historyRaw ? (JSON.parse(historyRaw) as SentHistoryItem[]) : [];
      const nextItem: SentHistoryItem = {
        requestId: draft.requestId,
        caseId: draft.caseId,
        sentAt: payload.sentAt,
        status: "未読",
        hospitalCount: draft.hospitals.length,
        hospitalNames: draft.hospitals.map((h) => h.hospitalName),
        searchMode: draft.searchMode,
        selectedDepartments: draft.selectedDepartments,
      };
      const deduped = [nextItem, ...history.filter((item) => item.requestId !== draft.requestId)].slice(0, 100);
      sessionStorage.setItem("hospital-request-history", JSON.stringify(deduped));
      if (draft.caseId) {
        await fetch("/api/cases/send-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: draft.caseId,
            item: nextItem,
          }),
        });
      }
    } finally {
      router.push(`/hospitals/request/completed?requestId=${encodeURIComponent(draft.requestId)}`);
    }
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="min-w-0 flex-1 overflow-auto px-8 py-6">
          <div className="mx-auto w-full max-w-[1320px]">
            <header className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">TRANSFER REQUEST</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">受入要請確認</h1>
              <p className="mt-1 text-sm text-slate-500">患者サマリーを最終確認して送信します。</p>
            </header>

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">読込中...</p>
              </section>
            ) : null}

            {!loading && !draft ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-lg font-bold text-amber-900">確認データが見つかりません</h2>
                <p className="mt-2 text-sm text-amber-800">
                  病院検索結果で「受入要請送信」を押してから、この画面へ遷移してください。
                </p>
                <div className="mt-4">
                  <Link
                    href={caseId ? `/hospitals/search?caseId=${encodeURIComponent(caseId)}` : "/hospitals/search"}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    病院検索へ戻る
                  </Link>
                </div>
              </section>
            ) : null}

            {!loading && draft ? (
              <div className="space-y-4">
                <section className="space-y-5">
                  <div className="rounded-2xl border border-slate-300 bg-white p-6">
                    <h2 className="text-lg font-bold text-slate-800">患者サマリー</h2>
                    <p className="mt-2 text-sm text-slate-500">基本情報・概要/主訴・バイタル・変更所見を一画面で確認します。</p>

                    <div className="mt-4 grid grid-cols-12 gap-4">
                      <div className="col-span-12 rounded-xl border border-slate-300 bg-sky-50/55 p-4">
                        <p className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">患者基本情報（全項目）</p>
                        <div className="mt-3 grid grid-cols-12 gap-3 text-sm">
                          <div className="col-span-3"><span className="text-xs text-slate-500">事案ID</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.caseId || caseId)}</p></div>
                          <div className="col-span-3"><span className="text-xs text-slate-500">氏名</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.name)}</p></div>
                          <div className="col-span-3"><span className="text-xs text-slate-500">性別</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.gender)}</p></div>
                          <div className="col-span-3"><span className="text-xs text-slate-500">生年月日</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.birthSummary)}</p></div>
                          <div className="col-span-2"><span className="text-xs text-slate-500">年齢</span><p className="font-semibold text-slate-800">{context?.age ? `${context.age}歳` : "未入力"}</p></div>
                          <div className="col-span-6"><span className="text-xs text-slate-500">住所</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.address)}</p></div>
                          <div className="col-span-4"><span className="text-xs text-slate-500">電話番号</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.phone)}</p></div>
                          <div className="col-span-3"><span className="text-xs text-slate-500">ADL</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.adl)}</p></div>
                          <div className="col-span-6"><span className="text-xs text-slate-500">アレルギー</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.allergy)}</p></div>
                          <div className="col-span-3"><span className="text-xs text-slate-500">体重(kg)</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.weight)}</p></div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {(context?.relatedPeople ?? []).map((person, idx) => (
                            <div key={`summary-related-${idx}`} className="rounded-lg border border-slate-300 bg-white p-2 text-xs">
                              <p className="font-semibold text-slate-700">関係者 {idx + 1}</p>
                              <p className="text-slate-600">氏名: {asSummaryValue(person.name)}</p>
                              <p className="text-slate-600">関係性: {asSummaryValue(person.relation)}</p>
                              <p className="text-slate-600">電話: {asSummaryValue(person.phone)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {(context?.pastHistories ?? []).map((item, idx) => (
                            <div key={`summary-history-${idx}`} className="rounded-lg border border-slate-300 bg-white p-2 text-xs">
                              <p className="font-semibold text-slate-700">既往症 {idx + 1}</p>
                              <p className="text-slate-600">病名: {asSummaryValue(item.disease)}</p>
                              <p className="text-slate-600">かかりつけ: {asSummaryValue(item.clinic)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-12 rounded-xl border border-slate-300 bg-emerald-50/45 p-4">
                        <p className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">概要 / 主訴 / 基本バイタル</p>
                        <div className="mt-3 grid grid-cols-12 gap-3 text-sm">
                          <div className="col-span-12"><span className="text-xs text-slate-500">要請概要</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.dispatchSummary)}</p></div>
                          <div className="col-span-12"><span className="text-xs text-slate-500">主訴</span><p className="font-semibold text-slate-800">{asSummaryValue(context?.chiefComplaint)}</p></div>
                          <div className="col-span-12 rounded-lg border border-blue-300 bg-blue-50 p-3">
                            <p className="text-sm font-semibold text-blue-700">最新バイタル（{asSummaryValue(latestVital?.measuredAt)}）</p>
                            <p className="mt-1 text-sm text-slate-700">
                              意識: {latestVital ? `${latestVital.consciousnessType.toUpperCase()} ${asSummaryValue(latestVital.consciousnessValue)}` : "未入力"} / 呼吸数: {asSummaryValue(latestVital?.respiratoryRate)} / 脈拍: {asSummaryValue(latestVital?.pulseRate)} / SpO2: {asSummaryValue(latestVital?.spo2)} / 体温: {latestVital?.temperatureUnavailable ? "測定不能" : asSummaryValue(latestVital?.temperature)}
                            </p>
                          </div>
                          <div className="col-span-12">
                            <p className="text-sm font-semibold text-slate-600">時系列バイタル</p>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {vitals.map((vital, idx) => (
                                <div key={`summary-vital-${idx}`} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700">
                                  <p className="font-semibold">{idx + 1}回目 ({asSummaryValue(vital.measuredAt)})</p>
                                  <p>意識: {vital.consciousnessType.toUpperCase()} {asSummaryValue(vital.consciousnessValue)}</p>
                                  <p>呼吸数: {asSummaryValue(vital.respiratoryRate)} / 脈拍: {asSummaryValue(vital.pulseRate)}</p>
                                  <p>SpO2: {asSummaryValue(vital.spo2)} / 体温: {vital.temperatureUnavailable ? "測定不能" : asSummaryValue(vital.temperature)}</p>
                                </div>
                              ))}
                              {vitals.length === 0 ? <p className="text-xs text-slate-500">バイタル未入力</p> : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-12 rounded-xl border border-slate-300 bg-amber-50/45 p-4">
                        <p className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">変更所見サマリー</p>
                        <div className="mt-3 space-y-2">
                          {findingCounts.map((item) => (
                            <div key={item.major} className={`rounded-lg border p-2 text-xs ${item.count > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-300 bg-white text-slate-500"}`}>
                              <p className="font-semibold">{item.major}</p>
                              <p>{item.count > 0 ? `${item.count}件変更` : "変更なし"}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-500">変更詳細</p>
                          <div className="mt-2 max-h-72 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-2 text-xs">
                            {changedFindings.length > 0 ? (
                              changedFindings.map((item, idx) => (
                                <div key={`changed-finding-${idx}`} className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1">
                                  <p className="font-semibold text-slate-700">
                                    {item.major} &gt; {item.middle}
                                  </p>
                                  <p className="mt-0.5 text-slate-600">{item.detail}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-500">変更なし</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
                  <p className="rounded-md bg-[var(--accent-blue-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-blue)]">送信先病院</p>
                  <p className="mt-2 text-xs text-slate-600">
                    検索条件: {draft.searchMode.toUpperCase()} / 選択科目: {draft.selectedDepartments.length > 0 ? draft.selectedDepartments.join(", ") : "-"}
                  </p>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-[980px] table-fixed text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">病院ID</th>
                          <th className="px-4 py-3">病院名</th>
                          <th className="px-4 py-3">科目</th>
                          <th className="px-4 py-3">住所</th>
                          <th className="px-4 py-3">電話番号</th>
                          <th className="px-4 py-3">距離</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.hospitals.map((hospital) => (
                          <tr key={hospital.hospitalId} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-semibold text-slate-700">{hospital.hospitalId}</td>
                            <td className="px-4 py-3 text-slate-700">{hospital.hospitalName}</td>
                            <td className="px-4 py-3 text-slate-700">{hospital.departments.join(", ") || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{hospital.address || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{hospital.phone || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{hospital.distanceKm == null ? "-" : `${hospital.distanceKm.toFixed(1)} km`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
                  <p className="text-xs text-slate-500">確認作成時刻: {createdAtLabel}</p>
                  <p className="mt-2 text-sm text-slate-700">最終確認です。送信していいですか？</p>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Link
                      href={caseId ? `/hospitals/search?caseId=${encodeURIComponent(caseId)}` : "/hospitals/search"}
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      戻る
                    </Link>
                    <button
                      type="button"
                      disabled={!canSend || submitting}
                      onClick={handleSend}
                      className="inline-flex items-center rounded-xl bg-[var(--accent-blue)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {submitting ? "送信中..." : "送信する"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
