"use client";

import Link from "next/link";
import { useMemo } from "react";

type RequestRow = {
  targetId: number;
  requestId: string;
  caseId: string;
  status: string;
  statusLabel: string;
  sentAt: string;
  fromTeamCode: string | null;
  fromTeamName: string | null;
  selectedDepartments: string[];
};

type HospitalRequestsTableProps = {
  rows: RequestRow[];
};

function statusClass(status: string): string {
  if (status === "UNREAD") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "READ") return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "NEGOTIATING") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "ACCEPTABLE") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "NOT_ACCEPTABLE") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "TRANSPORT_DECIDED") return "border-teal-200 bg-teal-50 text-teal-800";
  if (status === "TRANSPORT_DECLINED") return "border-zinc-300 bg-zinc-100 text-zinc-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function HospitalRequestsTable({ rows }: HospitalRequestsTableProps) {
  const normalizedRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        sentAtLabel: Number.isNaN(new Date(row.sentAt).getTime()) ? row.sentAt : new Date(row.sentAt).toLocaleString("ja-JP"),
      })),
    [rows],
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <table className="min-w-[1080px] table-fixed text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">送信時刻</th>
            <th className="px-4 py-3">事案ID</th>
            <th className="px-4 py-3">送信元救急隊</th>
            <th className="px-4 py-3">選択診療科</th>
            <th className="px-4 py-3">状態</th>
            <th className="px-4 py-3" aria-label="detail action" />
          </tr>
        </thead>
        <tbody>
          {normalizedRows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-sm text-slate-500" colSpan={6}>
                受入依頼はまだありません。
              </td>
            </tr>
          ) : null}
          {normalizedRows.map((row) => (
            <tr key={row.targetId} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{row.sentAtLabel}</td>
              <td className="px-4 py-3 font-semibold text-slate-700">{row.caseId}</td>
              <td className="px-4 py-3 text-slate-700">
                {row.fromTeamName ?? "-"}
                {row.fromTeamCode ? <span className="ml-2 text-xs text-slate-500">({row.fromTeamCode})</span> : null}
              </td>
              <td className="px-4 py-3 text-slate-700">{row.selectedDepartments?.join(", ") || "-"}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                  {row.statusLabel}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/hospitals/requests/${row.targetId}`}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  詳細
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

