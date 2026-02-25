"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";

type CaseSearchRow = {
  caseId: string;
  division: string;
  awareDate: string;
  awareTime: string;
  address: string;
  name: string;
  age: number;
  destination?: string | null;
};

type CaseSearchResponse = {
  rows: CaseSearchRow[];
  message?: string;
};

const DIVISION_OPTIONS = ["", "1部", "2部", "3部"];

export default function CaseSearchPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [q, setQ] = useState("");
  const [division, setDivision] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<CaseSearchRow[]>([]);

  const hasFilter = useMemo(() => q.trim().length > 0 || division !== "", [q, division]);

  const fetchCases = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (division) params.set("division", division);
      params.set("limit", "200");

      const res = await fetch(`/api/cases/search?${params.toString()}`);
      const data = (await res.json()) as CaseSearchResponse;
      if (!res.ok) throw new Error(data.message ?? "事案検索に失敗しました。");
      setRows(data.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "事案検索に失敗しました。");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCases();
    // 初回読込のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="flex min-w-0 flex-1 flex-col px-8 py-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">CASE SEARCH</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">事案検索</h1>
            <p className="mt-1 text-sm text-slate-500">事案ID・氏名・住所・主訴で検索できます。</p>
          </header>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            <div className="grid grid-cols-12 items-end gap-3">
              <label className="col-span-7">
                <span className="mb-1 block text-xs font-semibold text-slate-500">キーワード</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="事案ID / 氏名 / 住所 / 主訴"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-500">部別</span>
                <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {DIVISION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option || "すべて"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="col-span-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchCases()}
                  disabled={loading}
                  className="inline-flex items-center rounded-xl bg-[var(--accent-blue)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "検索中..." : "検索"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setDivision("");
                    setTimeout(() => void fetchCases(), 0);
                  }}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  クリア
                </button>
              </div>
            </div>
            {hasFilter ? <p className="mt-2 text-xs text-slate-500">フィルタ適用中</p> : null}
            {error ? <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
          </section>

          <section className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-800">検索結果</h2>
              <p className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{rows.length} 件</p>
            </div>

            <ul className="divide-y divide-slate-100">
              {rows.map((row) => (
                <li key={row.caseId} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{row.caseId}</p>
                    <p className="text-xs text-slate-500">
                      {row.division} | {row.awareDate} {row.awareTime} | {row.name} | {row.address}
                    </p>
                  </div>
                  <Link
                    href={`/cases/${row.caseId}`}
                    className="inline-flex items-center rounded-lg bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"
                  >
                    詳細を開く
                  </Link>
                </li>
              ))}
              {!loading && rows.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">該当する事案はありません。</li>
              ) : null}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
