"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RequestDetail = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status: string;
  statusLabel: string;
  openedAt: string | null;
  selectedDepartments: string[];
  fromTeamCode: string | null;
  fromTeamName: string | null;
};

type HospitalRequestDetailProps = {
  detail: RequestDetail;
};

const nextActions = [
  { label: "要相談", status: "NEGOTIATING" },
  { label: "受入可能", status: "ACCEPTABLE" },
  { label: "受入不可", status: "NOT_ACCEPTABLE" },
] as const;

export function HospitalRequestDetail({ detail }: HospitalRequestDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(detail.status);
  const [statusLabel, setStatusLabel] = useState(detail.statusLabel);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentAtLabel = Number.isNaN(new Date(detail.sentAt).getTime())
    ? detail.sentAt
    : new Date(detail.sentAt).toLocaleString("ja-JP");

  async function updateStatus(nextStatus: (typeof nextActions)[number]["status"]) {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/hospitals/requests/${detail.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message ?? "状態更新に失敗しました。");
        return;
      }
      const data = (await res.json()) as { status: string; statusLabel: string };
      setStatus(data.status);
      setStatusLabel(data.statusLabel);
      router.refresh();
    } catch {
      setError("状態更新に失敗しました。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">REQUEST DETAIL</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">受入依頼詳細</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
          <p>依頼ID: <span className="font-semibold">{detail.requestId}</span></p>
          <p>事案ID: <span className="font-semibold">{detail.caseId}</span></p>
          <p>送信時刻: <span className="font-semibold">{sentAtLabel}</span></p>
          <p>
            送信元救急隊: <span className="font-semibold">{detail.fromTeamName ?? "-"}</span>
            {detail.fromTeamCode ? ` (${detail.fromTeamCode})` : ""}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500">選択診療科</p>
          <p className="mt-1 text-sm text-slate-700">{detail.selectedDepartments.join(", ") || "-"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">STATUS</p>
        <p className="mt-2 text-sm text-slate-700">
          現在状態: <span className="font-semibold">{statusLabel}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {nextActions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isPending || status === action.status}
              onClick={() => updateStatus(action.status)}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {action.label}
            </button>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>
    </div>
  );
}

