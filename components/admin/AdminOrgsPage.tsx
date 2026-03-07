"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import { SettingSection } from "@/components/settings/SettingSection";
import type { AdminAuditLogRow, AdminOrgRow } from "@/lib/admin/adminManagementRepository";

type AdminOrgsPageProps = {
  initialRows: AdminOrgRow[];
};

function typeLabel(type: AdminOrgRow["type"]) {
  return type === "hospital" ? "病院" : "救急隊";
}

function actionLabel(action: string) {
  if (action === "admin.orgs.toggleActive") return "有効状態変更";
  if (action === "admin.orgs.update") return "更新";
  return action;
}

function AdminOrgEditor({ row, onUpdated }: { row: AdminOrgRow; onUpdated: (next: AdminOrgRow) => void }) {
  const [displayOrder, setDisplayOrder] = useState(String(row.displayOrder));
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [confirmMode, setConfirmMode] = useState<"save" | "activate" | "deactivate" | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/orgs/${row.type}/${row.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as { logs: AdminAuditLogRow[] };
      })
      .then((data) => {
        if (!active) return;
        setLogs(data.logs);
      })
      .catch(() => {
        if (!active) return;
        setLogs([]);
      });
    return () => {
      active = false;
    };
  }, [row.id, row.type]);

  const hasChanges = Number(displayOrder) !== row.displayOrder;

  const runUpdate = async (mode: "save" | "activate" | "deactivate") => {
    setStatus("saving");
    setMessage(undefined);
    setFieldError(undefined);

    try {
      const res = await fetch(`/api/admin/orgs/${row.type}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayOrder,
          isActive: mode === "activate" ? true : mode === "deactivate" ? false : row.isActive,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        fieldErrors?: Record<string, string>;
        row?: AdminOrgRow;
      };

      if (!res.ok || !data.row) {
        setStatus("error");
        setMessage(data.message ?? "組織更新に失敗しました。");
        setFieldError(data.fieldErrors?.displayOrder);
        return;
      }

      onUpdated(data.row);
      setStatus("saved");
      setMessage(mode === "activate" ? "組織を有効化しました。" : mode === "deactivate" ? "組織を無効化しました。" : "組織情報を更新しました。");
      setConfirmMode(null);

      const logsRes = await fetch(`/api/admin/orgs/${row.type}/${row.id}`);
      if (logsRes.ok) {
        const logsData = (await logsRes.json()) as { logs: AdminAuditLogRow[] };
        setLogs(logsData.logs);
      }
    } catch {
      setStatus("error");
      setMessage("通信に失敗しました。");
    }
  };

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">組織編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">表示順と有効状態を更新します。種別と識別コードは readOnly です。</p>
          </div>
          <SettingSaveStatus status={status} message={message} />
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">種別</span>
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{typeLabel(row.type)}</div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">識別コード</span>
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{row.code}</div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">名称</span>
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{row.name}</div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">表示順</span>
            <input
              type="number"
              min={0}
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
            />
            {fieldError ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldError}</span> : null}
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">状態</span>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className={`text-sm font-semibold ${row.isActive ? "text-emerald-700" : "text-slate-500"}`}>{row.isActive ? "有効" : "無効"}</span>
              <SettingActionButton tone={row.isActive ? "danger" : "secondary"} className="h-9 px-3 text-xs" onClick={() => setConfirmMode(row.isActive ? "deactivate" : "activate")}>
                {row.isActive ? "無効化する" : "有効化する"}
              </SettingActionButton>
            </div>
          </div>
          <div className="flex justify-end">
            <SettingActionButton disabled={!hasChanges || status === "saving"} onClick={() => setConfirmMode("save")}>
              変更を保存
            </SettingActionButton>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <h3 className="text-lg font-bold text-slate-900">変更履歴</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">選択中組織の最新 12 件の監査ログを表示します。</p>
        <div className="mt-5 space-y-3">
          {logs.length === 0 ? <p className="text-sm text-slate-500">履歴はまだありません。</p> : null}
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{actionLabel(log.action)}</p>
                <p className="text-xs text-slate-500">{log.createdAt}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">実行ロール: {log.actorRole}</p>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmMode === "save"}
        title="組織情報を更新しますか"
        description="表示順の変更を保存し、監査ログに記録します。"
        confirmLabel="保存する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("save")}
      />
      <ConfirmDialog
        open={confirmMode === "activate"}
        title="組織を有効化しますか"
        description="有効化すると一覧上で利用可能な状態に戻ります。"
        confirmLabel="有効化する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("activate")}
      />
      <ConfirmDialog
        open={confirmMode === "deactivate"}
        title="組織を無効化しますか"
        description="無効化すると管理上は残したまま利用停止状態にします。"
        confirmLabel="無効化する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("deactivate")}
      />
    </>
  );
}

export function AdminOrgsPage({ initialRows }: AdminOrgsPageProps) {
  const [rows, setRows] = useState(initialRows);
  const [selectedKey, setSelectedKey] = useState<string | null>(initialRows[0] ? `${initialRows[0].type}:${initialRows[0].id}` : null);
  const selectedRow = useMemo(
    () => rows.find((row) => `${row.type}:${row.id}` === selectedKey) ?? null,
    [rows, selectedKey],
  );

  return (
    <SettingPageLayout eyebrow="ADMIN MANAGEMENT" title="組織管理" description="病院と救急隊を統合一覧で管理し、表示順と有効状態を調整します。">
      <section className="grid gap-4 xl:grid-cols-4">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">TOTAL</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.length}</p>
          <p className="mt-2 text-sm text-slate-500">統合組織数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">HOSPITAL</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.filter((row) => row.type === "hospital").length}</p>
          <p className="mt-2 text-sm text-slate-500">病院数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">EMS</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.filter((row) => row.type === "ambulance_team").length}</p>
          <p className="mt-2 text-sm text-slate-500">救急隊数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">ACTIVE</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.filter((row) => row.isActive).length}</p>
          <p className="mt-2 text-sm text-slate-500">有効組織数</p>
        </SettingCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <SettingSection title="統合一覧" description="病院と救急隊を同一画面で確認し、編集対象を選択できます。">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["種別", "識別コード", "名称", "表示順", "状態"].map((label) => (
                      <th
                        key={label}
                        className={`px-4 py-3 text-xs font-semibold tracking-[0.12em] text-slate-500 ${
                          label === "種別"
                            ? "w-[5.5rem] min-w-[5.5rem] whitespace-nowrap text-left"
                            : label === "表示順"
                              ? "w-[5.5rem] min-w-[5.5rem] whitespace-nowrap text-left"
                              : label === "状態"
                                ? "w-[5.5rem] min-w-[5.5rem] whitespace-nowrap text-center"
                                : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                    <th className="w-[6rem] min-w-[6rem] whitespace-nowrap px-4 py-3 text-center text-xs font-semibold tracking-[0.12em] text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => {
                    const rowKey = `${row.type}:${row.id}`;
                    return (
                      <tr key={rowKey} className={rowKey === selectedKey ? "bg-amber-50/60" : ""}>
                        <td className="w-[5.5rem] min-w-[5.5rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">{typeLabel(row.type)}</td>
                        <td className="w-[7.5rem] min-w-[7.5rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">{row.code}</td>
                        <td className="px-4 py-1.5 text-sm text-slate-700">{row.name}</td>
                        <td className="w-[5rem] min-w-[5rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">{row.displayOrder}</td>
                        <td className="w-[5.5rem] min-w-[5.5rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">
                          <div className="flex justify-center">
                            <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {row.isActive ? "有効" : "無効"}
                            </span>
                          </div>
                        </td>
                        <td className="w-[6rem] min-w-[6rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">
                          <div className="flex justify-center">
                            <SettingActionButton tone={rowKey === selectedKey ? "primary" : "secondary"} className="h-7 whitespace-nowrap px-3 text-xs" onClick={() => setSelectedKey(rowKey)}>
                              {rowKey === selectedKey ? "選択中" : "詳細"}
                            </SettingActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </SettingSection>

        <div className="space-y-6 self-start xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1">
          {selectedRow ? (
            <AdminOrgEditor
              key={`${selectedRow.type}:${selectedRow.id}`}
              row={selectedRow}
              onUpdated={(next) => setRows((prev) => prev.map((row) => (row.type === next.type && row.id === next.id ? next : row)))}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">組織編集</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">一覧から組織を選択すると編集できます。</p>
            </div>
          )}
        </div>
      </div>
    </SettingPageLayout>
  );
}
