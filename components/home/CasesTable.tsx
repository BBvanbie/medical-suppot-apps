import Link from "next/link";

import { mockCases } from "@/lib/mockCases";

export function CasesTable() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            過去事案
          </p>
          <h2 className="text-lg font-bold text-slate-800">過去事案一覧</h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            直近 10 件
          </p>
          <Link
            href="/cases/new"
            className="inline-flex items-center rounded-xl border border-transparent bg-[var(--accent-blue)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"
          >
            新規事案作成
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1120px] table-fixed border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wide text-slate-500">
              <th className="sticky left-0 z-10 bg-white px-4 py-3">事案ID</th>
              <th className="px-4 py-3">部別</th>
              <th className="px-4 py-3">覚知日付(m/d)</th>
              <th className="px-4 py-3">覚知時間(h:mm)</th>
              <th className="px-4 py-3">住所</th>
              <th className="px-4 py-3">名前</th>
              <th className="px-4 py-3">年齢</th>
              <th className="px-4 py-3">搬送先</th>
              <th className="px-4 py-3" aria-label="detail action" />
            </tr>
          </thead>
          <tbody>
            {mockCases.map((row) => (
              <tr key={row.caseId} className="border-t border-slate-100 hover:bg-blue-50/40">
                <td className="sticky left-0 bg-inherit px-4 py-3 font-semibold text-slate-800">
                  {row.caseId}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.division}</td>
                <td className="px-4 py-3 text-slate-700">{row.awareDate}</td>
                <td className="px-4 py-3 text-slate-700">{row.awareTime}</td>
                <td className="px-4 py-3 text-slate-700">{row.address}</td>
                <td className="px-4 py-3 text-slate-700">{row.name}</td>
                <td className="px-4 py-3 text-slate-700">{row.age}</td>
                <td className="px-4 py-3 text-slate-700">{row.destination ?? "-"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/cases/${row.caseId}`}
                    className="inline-flex items-center rounded-lg bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"
                  >
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
