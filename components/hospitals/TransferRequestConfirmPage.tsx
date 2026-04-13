"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";
import { ActionFooter } from "@/components/shared/ActionFooter";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { PatientSummaryPanel } from "@/components/shared/PatientSummaryPanel";
import type { ChangedFindingEntry } from "@/lib/caseFindingsSummary";

type CaseContext = {
  caseId: string;
  name: string;
  age: string;
  address: string;
  phone?: string;
  gender?: string;
  birthSummary?: string;
  adl?: string;
  dnar?: string;
  allergy?: string;
  weight?: string;
  relatedPeople?: Array<{ name: string; relation: string; phone: string }>;
  pastHistories?: Array<{ disease: string; clinic: string }>;
  chiefComplaint: string;
  dispatchSummary: string;
  vitals?: Array<Record<string, unknown>>;
  changedFindings?: ChangedFindingEntry[];
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
  status?: "未読" | "既読" | "受入可能" | "搬送決定" | "搬送辞退";
  hospitalCount: number;
  hospitalNames: string[];
  searchMode?: "or" | "and";
  selectedDepartments?: string[];
};

export function TransferRequestConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const createdAtLabel = useMemo(() => {
    if (!draft?.createdAt) return "-";
    const d = new Date(draft.createdAt);
    if (Number.isNaN(d.getTime())) return draft.createdAt;
    return d.toLocaleString("ja-JP");
  }, [draft?.createdAt]);

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

        <main className="app-shell-main min-w-0 flex-1 overflow-auto">
          <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
            <header className="page-hero-copy page-hero-copy--tight mb-4">
              <p className="portal-eyebrow portal-eyebrow--hospital">TRANSFER REQUEST</p>
              <h1 className="page-hero-title page-hero-title--sm">受入要請確認</h1>
              <p className="page-hero-description">患者サマリーを最終確認して送信します。</p>
            </header>

            {loading ? (
              <section className="ds-panel-surface rounded-2xl p-6">
                <p className="text-sm text-slate-500">読み込み中...</p>
              </section>
            ) : null}

            {!loading && !draft ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-lg font-bold text-amber-900">確認データが見つかりません</h2>
                <p className="mt-2 text-sm text-amber-800">
                  病院検索画面で「送信前確認」へ進んだ後に、この画面を開いてください。
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
              <div className="page-stack page-stack--md">
                <section className="space-y-5">
  <div className="ds-panel-surface rounded-2xl p-6">
    <h2 className="text-lg font-bold text-slate-800">患者サマリー</h2>
    <p className="mt-2 text-sm text-slate-500">基本情報・概要/主訴・バイタル・変更所見を一画面で確認します。</p>
    <PatientSummaryPanel
      className="mt-4"
      caseId={context?.caseId || caseId}
      summary={context ? (context as unknown as Record<string, unknown>) : null}
    />
  </div>
</section>

                <section className="ds-panel-surface rounded-2xl p-5">
                  <p className="rounded-md bg-[var(--accent-blue-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-blue)]">送信候補病院</p>
                  <p className="mt-2 text-xs text-slate-600">
                    検索条件: {draft.searchMode.toUpperCase()} / 選定診療科: {draft.selectedDepartments.length > 0 ? draft.selectedDepartments.join(", ") : "-"}
                  </p>
                  <div className="mt-3 space-y-3">
                    {draft.hospitals.map((hospital) => (
                      <article key={hospital.hospitalId} className="ds-table-surface rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-bold text-slate-900">{hospital.hospitalName}</p>
                          <p className="text-xs font-semibold text-slate-500">病院ID: {hospital.hospitalId}</p>
                          {hospital.distanceKm != null ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {hospital.distanceKm.toFixed(1)} km
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">診療科</p>
                            <p className="mt-1 text-sm leading-6 text-slate-700">{hospital.departments.join(", ") || "-"}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">住所</p>
                            <p className="mt-1 text-sm leading-6 text-slate-700">{hospital.address || "-"}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">電話</p>
                            <p className="mt-1 text-sm leading-6 text-slate-700">{hospital.phone || "-"}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <ActionFooter
                  leading={
                    <>
                      <p className="text-xs text-slate-500">確認作成時刻: {createdAtLabel}</p>
                      <p className="mt-2 text-sm text-slate-700">最終確認です。送信していいですか？</p>
                    </>
                  }
                  actions={
                    <>
                      <Link
                        href={caseId ? `/hospitals/search?caseId=${encodeURIComponent(caseId)}` : "/hospitals/search"}
                        className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} rounded-xl px-4 py-2 text-sm`}
                      >
                        戻る
                      </Link>
                      <button
                        type="button"
                        disabled={!canSend || submitting}
                        onClick={handleSend}
                        className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} rounded-xl px-6 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-300`}
                      >
                        {submitting ? "送信中..." : "送信する"}
                      </button>
                    </>
                  }
                />
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
