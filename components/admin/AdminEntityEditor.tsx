"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { AdminAuditLogRow } from "@/lib/admin/adminManagementRepository";
import type { AdminEntityField } from "@/components/admin/AdminEntityCreateForm";

type AdminEntityEditorProps = {
  entityLabel: string;
  selectedRow: Record<string, string | number | boolean | null> | null;
  readOnlyFields: Array<{ key: string; label: string }>;
  editFields: AdminEntityField[];
  updateEndpointBase: string;
  logsEndpointBase: string;
  confirmUpdateTitle: string;
  confirmUpdateDescription: string;
  confirmActivateTitle: string;
  confirmActivateDescription: string;
  confirmDeactivateTitle: string;
  confirmDeactivateDescription: string;
  successUpdateMessage: string;
  successActivateMessage: string;
  successDeactivateMessage: string;
  onUpdated: (row: Record<string, string | number | boolean | null>) => void;
};

type ApiErrorResponse = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

function getInitialEditValues(selectedRow: Record<string, string | number | boolean | null> | null, fields: AdminEntityField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    const value = selectedRow?.[field.name];
    acc[field.name] = value == null ? "" : String(value);
    return acc;
  }, {});
}

function getActionLabel(action: string) {
  switch (action) {
    case "admin.hospitals.create":
    case "admin.ambulanceTeams.create":
      return "追加";
    case "admin.hospitals.update":
    case "admin.ambulanceTeams.update":
      return "更新";
    case "admin.hospitals.toggleActive":
    case "admin.ambulanceTeams.toggleActive":
      return "有効状態変更";
    default:
      return action;
  }
}

function getChangedKeys(log: AdminAuditLogRow) {
  const before = log.beforeJson ?? {};
  const after = log.afterJson ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

export function AdminEntityEditor({
  entityLabel,
  selectedRow,
  readOnlyFields,
  editFields,
  updateEndpointBase,
  logsEndpointBase,
  confirmUpdateTitle,
  confirmUpdateDescription,
  confirmActivateTitle,
  confirmActivateDescription,
  confirmDeactivateTitle,
  confirmDeactivateDescription,
  successUpdateMessage,
  successActivateMessage,
  successDeactivateMessage,
  onUpdated,
}: AdminEntityEditorProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => getInitialEditValues(selectedRow, editFields));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [logsStatus, setLogsStatus] = useState<"idle" | "loading" | "error">(() => (selectedRow?.id ? "loading" : "idle"));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [confirmMode, setConfirmMode] = useState<"update" | "activate" | "deactivate" | null>(null);

  useEffect(() => {
    if (!selectedRow?.id) {
      return;
    }

    let active = true;
    void fetch(`${logsEndpointBase}/${selectedRow.id}/logs`)
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as { logs: AdminAuditLogRow[] };
      })
      .then((data) => {
        if (!active) return;
        setLogs(data.logs);
        setLogsStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setLogs([]);
        setLogsStatus("error");
      });

    return () => {
      active = false;
    };
  }, [logsEndpointBase, selectedRow?.id]);

  const isActive = Boolean(selectedRow?.isActive);
  const hasChanges = useMemo(() => {
    if (!selectedRow) return false;
    return editFields.some((field) => String(selectedRow[field.name] ?? "") !== String(formValues[field.name] ?? ""));
  }, [editFields, formValues, selectedRow]);

  const updateBody = (nextIsActive: boolean) => {
    const body = editFields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.name] = formValues[field.name] ?? "";
      return acc;
    }, {});
    body.isActive = nextIsActive;
    return body;
  };

  const runUpdate = async (mode: "update" | "activate" | "deactivate") => {
    if (!selectedRow?.id) return;

    setStatus("saving");
    setStatusMessage(undefined);

    try {
      const res = await fetch(`${updateEndpointBase}/${selectedRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateBody(mode === "deactivate" ? false : mode === "activate" ? true : isActive)),
      });

      const data = (await res.json().catch(() => ({}))) as ApiErrorResponse & {
        row?: Record<string, string | number | boolean | null>;
      };

      if (!res.ok || !data.row) {
        setStatus("error");
        setStatusMessage(data.message ?? "更新に失敗しました。");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      onUpdated(data.row);
      setStatus("saved");
      setStatusMessage(
        mode === "activate" ? successActivateMessage : mode === "deactivate" ? successDeactivateMessage : successUpdateMessage,
      );
      setConfirmMode(null);

      const logsRes = await fetch(`${logsEndpointBase}/${selectedRow.id}/logs`);
      if (logsRes.ok) {
        const logsData = (await logsRes.json()) as { logs: AdminAuditLogRow[] };
        setLogs(logsData.logs);
      }
    } catch {
      setStatus("error");
      setStatusMessage("通信に失敗しました。");
    }
  };

  if (!selectedRow) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-lg font-bold text-slate-900">{entityLabel}編集</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">一覧から対象を選択すると、編集・有効切替・履歴確認ができます。</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{entityLabel}編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">識別子は readOnly とし、運用上の編集項目と有効状態のみ変更できます。</p>
          </div>
          <SettingSaveStatus status={status} message={statusMessage} />
        </div>

        <div className="mt-5 grid gap-4">
          {readOnlyFields.map((field) => (
            <div key={field.key}>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">{field.label}</span>
              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                {selectedRow[field.key] == null || selectedRow[field.key] === "" ? "-" : String(selectedRow[field.key])}
              </div>
            </div>
          ))}

          {editFields.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {field.label}
                {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
              </span>
              {field.type === "select" ? (
                <select
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
                />
              )}
              {fieldErrors[field.name] ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors[field.name]}</span> : null}
            </label>
          ))}

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">状態</span>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className={`text-sm font-semibold ${isActive ? "text-emerald-700" : "text-slate-500"}`}>{isActive ? "有効" : "無効"}</span>
              <SettingActionButton tone={isActive ? "danger" : "secondary"} className="h-9 px-3 text-xs" onClick={() => setConfirmMode(isActive ? "deactivate" : "activate")}>
                {isActive ? "無効化する" : "有効化する"}
              </SettingActionButton>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <SettingActionButton disabled={!hasChanges || status === "saving"} onClick={() => setConfirmMode("update")}>
            変更を保存
          </SettingActionButton>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">変更履歴</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">選択中の対象に対する最新 12 件の監査ログを表示します。</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {logsStatus === "loading" ? <p className="text-sm text-slate-500">履歴を読み込み中です。</p> : null}
          {logsStatus === "error" ? <p className="text-sm text-rose-600">履歴の取得に失敗しました。</p> : null}
          {logsStatus === "idle" && logs.length === 0 ? <p className="text-sm text-slate-500">履歴はまだありません。</p> : null}
          {logs.map((log) => {
            const changedKeys = getChangedKeys(log);
            return (
              <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{getActionLabel(log.action)}</p>
                  <p className="text-xs text-slate-500">{log.createdAt}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">実行ロール: {log.actorRole}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {changedKeys.length > 0 ? `変更項目: ${changedKeys.join(", ")}` : "差分情報なし"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={confirmMode === "update"}
        title={confirmUpdateTitle}
        description={confirmUpdateDescription}
        confirmLabel="保存する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("update")}
      />
      <ConfirmDialog
        open={confirmMode === "activate"}
        title={confirmActivateTitle}
        description={confirmActivateDescription}
        confirmLabel="有効化する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("activate")}
      />
      <ConfirmDialog
        open={confirmMode === "deactivate"}
        title={confirmDeactivateTitle}
        description={confirmDeactivateDescription}
        confirmLabel="無効化する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("deactivate")}
      />
    </>
  );
}
