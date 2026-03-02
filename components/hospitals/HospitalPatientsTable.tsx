"use client";

import { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type PatientRow = {
  target_id: number;
  updated_at: string;
  team_name: string | null;
  patient_name: string | null;
  scene_address: string | null;
  distance_km: number | null;
};

type HospitalPatientsTableProps = {
  rows: PatientRow[];
};

type RequestDetailResponse = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  awareDate?: string;
  awareTime?: string;
  dispatchAddress?: string;
  status: string;
  statusLabel: string;
  openedAt: string | null;
  patientSummary: Record<string, unknown> | null;
  selectedDepartments: string[];
  fromTeamCode: string | null;
  fromTeamName: string | null;
  consultComment?: string | null;
  emsReplyComment?: string | null;
};

export function HospitalPatientsTable({ rows }: HospitalPatientsTableProps) {
  const [activeTargetId, setActiveTargetId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<RequestDetailResponse | null>(null);

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        updatedAtLabel: formatDateTimeMdHm(row.updated_at),
      })),
    [rows],
  );

  const openDetail = async (targetId: number) => {
    setActiveTargetId(targetId);
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}`);
      const data = (await res.json()) as RequestDetailResponse | { message?: string };
      if (!res.ok) {
        throw new Error("message" in data ? data.message ?? "詳細取得に失敗しました。" : "詳細取得に失敗しました。");
      }
      setDetail(data as RequestDetailResponse);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "詳細取得に失敗しました。");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setActiveTargetId(null);
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
  };

  return (
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <table className="min-w-[980px] table-fixed text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">更新日時</th>
            <th className="px-4 py-3">依頼元救急隊</th>
            <th className="px-4 py-3">患者名</th>
            <th className="px-4 py-3">現場住所</th>
            <th className="px-4 py-3">距離</th>
            <th className="px-4 py-3">詳細</th>
          </tr>
        </thead>
        <tbody>
          {normalizedRows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-sm text-slate-500" colSpan={6}>
                搬送患者はまだありません。
              </td>
            </tr>
          ) : null}
          {normalizedRows.map((row, index) => (
            <tr key={`${row.updated_at}-${index}`} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{row.updatedAtLabel}</td>
              <td className="px-4 py-3 text-slate-700">{row.team_name ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.patient_name ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.scene_address ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">
                {typeof row.distance_km === "number" && Number.isFinite(row.distance_km)
                  ? `${row.distance_km.toFixed(1)} km`
                  : "-"}
              </td>
              <td className="px-4 py-3 text-slate-700">
                <button
                  type="button"
                  onClick={() => void openDetail(row.target_id)}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                >
                  詳細
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeTargetId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={closeDetail}>
          <div
            className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--dashboard-bg)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-end border-b border-slate-200 bg-[var(--dashboard-bg)] px-4 py-3">
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="閉じる"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {detailLoading ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500">読み込み中...</p> : null}
              {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
              {detail ? <HospitalRequestDetail detail={detail} showStatusSection={false} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

