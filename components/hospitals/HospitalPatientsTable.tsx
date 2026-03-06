"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type PatientRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  status: string;
  decided_at: string;
  aware_date: string | null;
  aware_time: string | null;
  team_name: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_gender: string | null;
  dispatch_address: string | null;
  selected_departments: string[];
  selected_department_short_names: string[];
};

type Department = {
  id: number;
  name: string;
  shortName: string;
};

type HospitalPatientsTableProps = {
  rows: PatientRow[];
  departments: Department[];
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
  fromTeamPhone?: string | null;
  consultComment?: string | null;
  emsReplyComment?: string | null;
};

type ConsultMessage = {
  id: number;
  actor: "HP" | "A";
  actedAt: string;
  note: string;
};

export function HospitalPatientsTable({ rows, departments }: HospitalPatientsTableProps) {
  const router = useRouter();
  const [rowsState, setRowsState] = useState(rows);

  const [activeTargetId, setActiveTargetId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<RequestDetailResponse | null>(null);

  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [departmentTargetId, setDepartmentTargetId] = useState<number | null>(null);
  const [selectedDepartmentShortNames, setSelectedDepartmentShortNames] = useState<string[]>([]);
  const [departmentSaveError, setDepartmentSaveError] = useState("");
  const [departmentSaving, setDepartmentSaving] = useState(false);

  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultTargetId, setConsultTargetId] = useState<number | null>(null);
  const [consultTitle, setConsultTitle] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState("");
  const [consultSending, setConsultSending] = useState(false);
  const [consultNote, setConsultNote] = useState("");
  const [consultMessages, setConsultMessages] = useState<ConsultMessage[]>([]);

  useEffect(() => {
    setRowsState(rows);
  }, [rows]);

  const normalizedRows = useMemo(
    () =>
      rowsState.map((row) => ({
        ...row,
        decidedAtLabel: formatDateTimeMdHm(row.decided_at),
        awareDateTimeLabel: [formatAwareDateYmd(row.aware_date ?? ""), row.aware_time].filter(Boolean).join(" ") || "-",
      })),
    [rowsState],
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
    router.refresh();
  };

  const toggleDepartment = (shortName: string) => {
    setSelectedDepartmentShortNames((current) => {
      if (current.includes(shortName)) return current.filter((v) => v !== shortName);
      return [...current, shortName];
    });
  };

  const openDepartmentModal = (row: PatientRow) => {
    setDepartmentTargetId(row.target_id);
    setSelectedDepartmentShortNames(row.selected_department_short_names);
    setDepartmentSaveError("");
    setDepartmentSaving(false);
    setIsDepartmentModalOpen(true);
  };

  const closeDepartmentModal = () => {
    if (departmentSaving) return;
    setIsDepartmentModalOpen(false);
    setDepartmentTargetId(null);
    setSelectedDepartmentShortNames([]);
    setDepartmentSaveError("");
  };

  const saveDepartments = async () => {
    if (departmentTargetId === null) return;
    setDepartmentSaving(true);
    setDepartmentSaveError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${departmentTargetId}/departments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDepartments: selectedDepartmentShortNames }),
      });
      const data = (await res.json().catch(() => null)) as
        | { selectedDepartments?: string[]; selectedDepartmentShortNames?: string[]; message?: string }
        | null;
      if (!res.ok) throw new Error(data?.message ?? "科目の更新に失敗しました。");

      const nextLabels = data?.selectedDepartments ?? [];
      const nextShortNames = data?.selectedDepartmentShortNames ?? selectedDepartmentShortNames;
      setRowsState((current) =>
        current.map((row) =>
          row.target_id === departmentTargetId
            ? { ...row, selected_departments: nextLabels, selected_department_short_names: nextShortNames }
            : row,
        ),
      );
      closeDepartmentModal();
    } catch (e) {
      setDepartmentSaveError(e instanceof Error ? e.message : "科目の更新に失敗しました。");
    } finally {
      setDepartmentSaving(false);
    }
  };

  const fetchConsultMessages = async (targetId: number) => {
    setConsultLoading(true);
    setConsultError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}/consult`);
      const data = (await res.json()) as { messages?: ConsultMessage[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "相談履歴の取得に失敗しました。");
      setConsultMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      setConsultError(e instanceof Error ? e.message : "相談履歴の取得に失敗しました。");
      setConsultMessages([]);
    } finally {
      setConsultLoading(false);
    }
  };

  const openConsult = async (row: PatientRow) => {
    setConsultTargetId(row.target_id);
    setConsultTitle(`${row.case_id} / ${row.request_id}`);
    setConsultNote("");
    setConsultError("");
    setConsultMessages([]);
    setIsConsultModalOpen(true);
    await fetchConsultMessages(row.target_id);
  };

  const closeConsult = () => {
    if (consultSending) return;
    setIsConsultModalOpen(false);
    setConsultTargetId(null);
    setConsultTitle("");
    setConsultLoading(false);
    setConsultError("");
    setConsultNote("");
    setConsultMessages([]);
  };

  const sendConsult = async () => {
    if (!consultTargetId || !consultNote.trim() || consultSending) return;
    setConsultSending(true);
    setConsultError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${consultTargetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "NEGOTIATING", note: consultNote.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "相談送信に失敗しました。");
      setConsultNote("");
      await fetchConsultMessages(consultTargetId);
      router.refresh();
    } catch (e) {
      setConsultError(e instanceof Error ? e.message : "相談送信に失敗しました。");
    } finally {
      setConsultSending(false);
    }
  };

  return (
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <table className="min-w-[1760px] table-fixed text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">事案ID</th>
            <th className="px-4 py-3">覚知日時</th>
            <th className="px-4 py-3">指令先住所</th>
            <th className="px-4 py-3">氏名</th>
            <th className="px-4 py-3">年齢</th>
            <th className="px-4 py-3">性別</th>
            <th className="px-4 py-3">搬送決定日時</th>
            <th className="px-4 py-3">科目</th>
            <th className="px-4 py-3">搬送救急隊名</th>
            <th className="px-4 py-3">相談</th>
            <th className="px-4 py-3">詳細</th>
            <th className="px-4 py-3">科目修正</th>
          </tr>
        </thead>
        <tbody>
          {normalizedRows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-sm text-slate-500" colSpan={12}>
                搬送患者はまだありません。
              </td>
            </tr>
          ) : null}
          {normalizedRows.map((row, index) => (
            <tr key={`${row.target_id}-${row.case_id}-${index}`} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold text-slate-700">{row.case_id || "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.awareDateTimeLabel}</td>
              <td className="px-4 py-3 text-slate-700">{row.dispatch_address ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.patient_name ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.patient_age ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.patient_gender ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.decidedAtLabel}</td>
              <td className="px-4 py-3 text-slate-700">{row.selected_departments.join(", ") || "-"}</td>
              <td className="px-4 py-3 text-slate-700">{row.team_name ?? "-"}</td>
              <td className="px-4 py-3 text-slate-700">
                {row.status === "NEGOTIATING" ? (
                  <button
                    type="button"
                    onClick={() => void openConsult(row)}
                    className="inline-flex h-8 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    相談
                  </button>
                ) : (
                  "-"
                )}
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
              <td className="px-4 py-3 text-slate-700">
                <button
                  type="button"
                  onClick={() => openDepartmentModal(row)}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                >
                  科目修正
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeTargetId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={closeDetail}>
          <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--dashboard-bg)] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-end border-b border-slate-200 bg-[var(--dashboard-bg)] px-4 py-3">
              <button type="button" onClick={closeDetail} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50" aria-label="閉じる">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {detailLoading ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500">読み込み中...</p> : null}
              {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
              {detail ? (
                <HospitalRequestDetail
                  detail={detail}
                  showStatusSection={false}
                  showBottomNotAcceptableAction
                  forcePhoneCallOnNotAcceptable
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isDepartmentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={closeDepartmentModal}>
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">DEPARTMENTS</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">科目修正</h3>
            <p className="mt-1 text-sm text-slate-600">科目カードを選択して更新してください（複数選択可）。</p>
            <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-5">
              {departments.map((department) => {
                const selected = selectedDepartmentShortNames.includes(department.shortName);
                return (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => toggleDepartment(department.shortName)}
                    className={`flex min-h-12 items-center justify-center rounded-lg border px-2 py-2 text-center text-[11px] font-semibold transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {department.name}
                  </button>
                );
              })}
            </div>
            {departmentSaveError ? <p className="mt-3 text-sm text-rose-700">{departmentSaveError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDepartmentModal}
                disabled={departmentSaving}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void saveDepartments()}
                disabled={departmentSaving}
                className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {departmentSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConsultChatModal
        open={isConsultModalOpen}
        title="相談チャット"
        subtitle={consultTitle}
        messages={consultMessages}
        loading={consultLoading}
        error={consultError}
        note={consultNote}
        noteLabel="HP側コメント"
        notePlaceholder="A側へ送る相談内容を入力してください"
        sending={consultSending}
        canSend={Boolean(consultNote.trim())}
        onClose={closeConsult}
        onChangeNote={setConsultNote}
        onSend={() => void sendConsult()}
      />
    </section>
  );
}
