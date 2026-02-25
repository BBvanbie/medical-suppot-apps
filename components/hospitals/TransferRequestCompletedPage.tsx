"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";

type SentRequest = {
  requestId: string;
  caseId: string;
  sentAt: string;
  hospitals: Array<{
    hospitalId: number;
    hospitalName: string;
  }>;
};

export function TransferRequestCompletedPage() {
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<SentRequest | null>(null);

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    try {
      const raw = requestId ? sessionStorage.getItem(`hospital-request-sent:${requestId}`) : null;
      if (!raw) {
        setSent(null);
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw) as SentRequest;
      setSent(parsed);
    } catch {
      setSent(null);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const sentAtLabel = useMemo(() => {
    if (!sent?.sentAt) return "-";
    const d = new Date(sent.sentAt);
    if (Number.isNaN(d.getTime())) return sent.sentAt;
    return d.toLocaleString("ja-JP");
  }, [sent?.sentAt]);

  const caseId = sent?.caseId ?? "";

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="min-w-0 flex-1 overflow-auto px-8 py-6">
          <div className="mx-auto w-full max-w-[960px]">
            <header className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">TRANSFER REQUEST</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">送信完了</h1>
            </header>

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">読込中...</p>
              </section>
            ) : null}

            {!loading && !sent ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-lg font-bold text-amber-900">送信情報が見つかりません</h2>
                <p className="mt-2 text-sm text-amber-800">確認ページから送信を実行した後にこの画面を開いてください。</p>
                <div className="mt-4">
                  <Link href="/hospitals/search" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    病院検索へ戻る
                  </Link>
                </div>
              </section>
            ) : null}

            {!loading && sent ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
                <p className="inline-flex rounded-md bg-[var(--accent-blue-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-blue)]">送信完了</p>
                <h2 className="mt-3 text-xl font-bold text-slate-900">受入要請の送信が完了しました</h2>
                <p className="mt-2 text-sm text-slate-700">送信時刻: {sentAtLabel}</p>
                <p className="mt-1 text-sm text-slate-700">送信件数: {sent.hospitals.length} 件</p>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">送信先病院</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sent.hospitals.map((hospital) => (
                      <span key={hospital.hospitalId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {hospital.hospitalName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <Link
                    href={caseId ? `/hospitals/search?caseId=${encodeURIComponent(caseId)}` : "/hospitals/search"}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    病院検索へ戻る
                  </Link>
                  {caseId ? (
                    <Link
                      href={`/cases/${encodeURIComponent(caseId)}`}
                      className="inline-flex items-center rounded-xl bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      事案情報へ戻る
                    </Link>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
