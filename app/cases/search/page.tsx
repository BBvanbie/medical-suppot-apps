import Link from "next/link";

import { mockCases } from "@/lib/mockCases";

export default function CaseSearchPage() {
  return (
    <div className="dashboard-shell min-h-screen bg-[var(--dashboard-bg)] px-8 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">CASE SEARCH</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">事案検索</h1>
          <p className="mt-1 text-sm text-slate-500">
            事案を選択すると、共通の事案詳細ページを開きます。
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <ul className="divide-y divide-slate-100">
            {mockCases.map((row) => (
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
          </ul>
        </section>
      </div>
    </div>
  );
}
