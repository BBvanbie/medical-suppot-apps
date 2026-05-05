"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { HospitalPatientFollowUpSummary } from "@/components/hospitals/HospitalPatientFollowUpSummary";
import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { DetailDialogFrame } from "@/components/shared/DetailDialogFrame";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatCaseGenderLabel } from "@/lib/casePresentation";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";
import { canOpenHospitalConsultChat } from "@/lib/hospitalConsultChat";
import { getHospitalDepartmentPrioritySummary, getHospitalNextActionLabel } from "@/lib/hospitalPriority";

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
  consultTemplate?: string;
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

export function HospitalPatientsTable({ rows, departments, consultTemplate = "" }: HospitalPatientsTableProps) {
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
  const [consultTemplateSelection, setConsultTemplateSelection] = useState("");

  useEffect(() => {
    setRowsState(rows);
  }, [rows]);

  const normalizedRows = useMemo(
    () =>
      rowsState.map((row) => ({
        ...row,
        decidedAtLabel: formatDateTimeMdHm(row.decided_at),
        awareDateTimeLabel: [formatAwareDateYmd(row.aware_date ?? ""), row.aware_time].filter(Boolean).join(" ") || "-",
        prioritySummary: getHospitalDepartmentPrioritySummary(row.selected_departments),
        nextActionLabel: getHospitalNextActionLabel(row.status),
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
      if (!res.ok) throw new Error(data?.message ?? "診療科の更新に失敗しました。");

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
      setDepartmentSaveError(e instanceof Error ? e.message : "診療科の更新に失敗しました。");
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
    setConsultTemplateSelection("");
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
    setConsultTemplateSelection("");
  };

  const sendConsult = async () => {
    if (!consultTargetId || !consultNote.trim() || consultSending) return;
    setConsultSending(true);
    setConsultError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${consultTargetId}/consult`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: consultNote.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "相談送信に失敗しました。");
      setConsultNote("");
      setConsultTemplateSelection("");
      await fetchConsultMessages(consultTargetId);
      router.refresh();
    } catch (e) {
      setConsultError(e instanceof Error ? e.message : "相談送信に失敗しました。");
    } finally {
      setConsultSending(false);
    }
  };

  return (
    <section className="space-y-3" data-testid="hospital-patients-table">
      {normalizedRows.length === 0 ? (
        <div className="ds-table-surface px-4 py-8 text-sm text-slate-500">
          受入患者はまだありません。
        </div>
      ) : null}
      {normalizedRows.map((row, index) => (
        <article key={`${row.target_id}-${row.case_id}-${index}`} className="ds-table-surface border border-slate-200 px-4 py-4">
          <div className="grid gap-4 xl:ds-grid-fluid-action">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-slate-950">{row.case_id || "-"}</p>
                <RequestStatusBadge status={row.status} />
                {row.prioritySummary ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 ds-text-2xs font-semibold text-emerald-700">
                    {row.prioritySummary}
                  </span>
                ) : null}
                <span className="rounded-full bg-blue-50 px-2.5 py-1 ds-text-2xs font-semibold text-blue-700">
                  {row.nextActionLabel}
                </span>
                <p className="text-xs font-semibold text-slate-500">{row.request_id}</p>
              </div>
              <div className="mt-3 grid gap-3 ds-grid-md-hospital-patient-row">
                <div>
                  <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">患者</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{row.patient_name ?? "-"}</p>
                </div>
                <div>
                  <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">年齢 / 性別</p>
                  <p className="mt-1 text-sm text-slate-700">{row.patient_age ?? "-"} / {formatCaseGenderLabel(row.patient_gender)}</p>
                </div>
                <div>
                  <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">覚知</p>
                  <p className="mt-1 text-sm text-slate-700">{row.awareDateTimeLabel}</p>
                </div>
                <div>
                  <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">受入決定</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{row.decidedAtLabel}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-start justify-end gap-2">
              {canOpenHospitalConsultChat(row.status) ? (
                <button
                  type="button"
                  onClick={() => void openConsult(row)}
                  className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  相談
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void openDetail(row.target_id)}
                className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
              >
                詳細
              </button>
              <button
                type="button"
                onClick={() => openDepartmentModal(row)}
                className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
              >
                診療科修正
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 ds-grid-md-hospital-patient-summary">
            <div>
              <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">現場住所</p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{row.dispatch_address ?? "-"}</p>
            </div>
            <div>
              <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">診療科</p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{row.selected_departments.join(", ") || "-"}</p>
            </div>
            <div>
              <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">受入救急隊</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{row.team_name ?? "-"}</p>
            </div>
          </div>
        </article>
      ))}

      <DetailDialogFrame open={activeTargetId !== null} onClose={closeDetail}>
        {detailLoading ? <p className="ds-muted-panel rounded-xl p-4 text-sm text-slate-500">読み込み中...</p> : null}
        {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
        {detail ? (
          <div className="space-y-4">
            <HospitalPatientFollowUpSummary
              status={detail.status}
              selectedDepartments={detail.selectedDepartments}
              requestId={detail.requestId}
              caseId={detail.caseId}
              teamName={detail.fromTeamName}
            />
            <HospitalRequestDetail
              detail={detail}
              showStatusSection={false}
              showBottomNotAcceptableAction
              forcePhoneCallOnNotAcceptable
            />
          </div>
        ) : null}
      </DetailDialogFrame>

      {isDepartmentModalOpen ? (
        <div className="modal-shell-pad ds-dialog-backdrop" onClick={closeDepartmentModal}>
          <div className="ds-dialog-surface w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase ds-track-eyebrow-wide text-blue-600">DEPARTMENTS</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">診療科修正</h3>
            <p className="mt-1 text-sm text-slate-600">診療科カードを選択して更新してください。複数選択可能です。</p>
            <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-5">
              {departments.map((department) => {
                const selected = selectedDepartmentShortNames.includes(department.shortName);
                return (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => toggleDepartment(department.shortName)}
                    className={`flex min-h-12 items-center justify-center rounded-lg border px-2 py-2 text-center ds-text-xs-compact font-semibold transition ${
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
                className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-10 rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void saveDepartments()}
                disabled={departmentSaving}
                className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} h-10 rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
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
        templateValue={consultTemplateSelection}
        templateOptions={consultTemplate.trim() ? [{ value: "", label: "テンプレートを選択" }, { value: "consult-template", label: "要相談テンプレート" }] : []}
        onTemplateChange={(value) => {
          setConsultTemplateSelection(value);
          if (value === "consult-template") {
            setConsultNote(consultTemplate);
          }
        }}
      />
    </section>
  );
}
