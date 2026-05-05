"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AdminWorkbenchMetric,
  AdminWorkbenchPage,
  AdminWorkbenchSection,
  adminActionButtonClass,
} from "@/components/admin/AdminWorkbench";
import { AuditTrailList } from "@/components/shared/AuditTrailList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DetailMetadataGrid } from "@/components/shared/DetailMetadataGrid";
import { SelectableRowCard } from "@/components/shared/SelectableRowCard";
import { SplitWorkbenchLayout } from "@/components/shared/SplitWorkbenchLayout";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
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
      setMessage(
        mode === "activate" ? "組織を有効化しました。" : mode === "deactivate" ? "組織を無効化しました。" : "組織情報を更新しました。",
      );
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
      <div className="ds-panel-surface px-5 py-5">
        <div className="ds-panel-header flex items-start justify-between gap-4 pb-4">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-orange-600">ORG EDITOR</p>
            <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">組織編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">表示順と有効状態を更新します。種別と識別コードは read-only です。</p>
          </div>
          <SettingSaveStatus status={status} message={message} />
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <span className="ds-field-label">種別</span>
            <div className="ds-field flex items-center ds-bg-neutral text-slate-600" aria-readonly="true">{typeLabel(row.type)}</div>
          </div>
          <div>
            <span className="ds-field-label">識別コード</span>
            <div className="ds-field flex items-center ds-bg-neutral text-slate-600" aria-readonly="true">{row.code}</div>
          </div>
          <div>
            <span className="ds-field-label">名称</span>
            <div className="ds-field flex items-center ds-bg-neutral text-slate-600" aria-readonly="true">{row.name}</div>
          </div>
          <label className="block">
            <span className="ds-field-label">表示順</span>
            <input
              type="number"
              min={0}
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              className="ds-field"
            />
            {fieldError ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldError}</span> : null}
          </label>
          <div className="ds-muted-panel ds-radius-command px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">STATUS</p>
                <p className={`mt-1 text-sm font-semibold ${row.isActive ? "text-emerald-700" : "text-slate-500"}`}>{row.isActive ? "有効" : "無効"}</p>
              </div>
              <button type="button" className={adminActionButtonClass(row.isActive ? "secondary" : "primary")} onClick={() => setConfirmMode(row.isActive ? "deactivate" : "activate")}>
                {row.isActive ? "無効化する" : "有効化する"}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={!hasChanges || status === "saving"} onClick={() => setConfirmMode("save")} className={adminActionButtonClass("primary")}>
              変更を保存
            </button>
          </div>
        </div>
      </div>

      <div className="ds-panel-surface px-5 py-5">
        <div className="ds-panel-header pb-4">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-orange-600">AUDIT TRAIL</p>
          <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">変更履歴</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">選択中組織の最新 12 件の監査ログを表示します。</p>
        </div>
        <AuditTrailList
          items={logs.map((log) => ({
            id: log.id,
            title: actionLabel(log.action),
            timestamp: log.createdAt,
            actorRole: log.actorRole,
          }))}
        />
      </div>

      <ConfirmDialog open={confirmMode === "save"} title="組織情報を更新しますか" description="表示順の変更を保存し、監査ログに記録します。" confirmLabel="保存する" busy={status === "saving"} onCancel={() => setConfirmMode(null)} onConfirm={() => void runUpdate("save")} />
      <ConfirmDialog open={confirmMode === "activate"} title="組織を有効化しますか" description="有効化すると一覧上で利用可能な状態に戻ります。" confirmLabel="有効化する" busy={status === "saving"} onCancel={() => setConfirmMode(null)} onConfirm={() => void runUpdate("activate")} />
      <ConfirmDialog open={confirmMode === "deactivate"} title="組織を無効化しますか" description="無効化すると管理上は残したまま利用停止状態にします。" confirmLabel="無効化する" busy={status === "saving"} onCancel={() => setConfirmMode(null)} onConfirm={() => void runUpdate("deactivate")} />
    </>
  );
}

function OrgListRow({ row, selected, onSelect }: { row: AdminOrgRow; selected: boolean; onSelect: () => void }) {
  return (
    <SelectableRowCard selected={selected} onSelect={onSelect}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="ds-text-md font-bold text-slate-950">{row.name}</p>
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 ds-text-xs-compact font-semibold text-slate-700">{typeLabel(row.type)}</span>
            <span className={`inline-flex rounded-full px-2.5 py-1 ds-text-xs-compact font-semibold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{row.isActive ? "有効" : "無効"}</span>
          </div>
          <p className="mt-1 ds-text-xs-plus text-slate-500">{row.code}</p>
        </div>
        <span className={`${selected ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} shrink-0`}>{selected ? "編集中" : "詳細"}</span>
      </div>

      <div className="mt-4">
        <DetailMetadataGrid
          columnsClassName="md:grid-cols-3"
          itemClassName="bg-white"
          items={[
            { label: "表示順", value: String(row.displayOrder) },
            { label: "種別", value: typeLabel(row.type) },
            { label: "運用状態", value: row.isActive ? "利用中" : "停止中" },
          ]}
        />
      </div>
    </SelectableRowCard>
  );
}

export function AdminOrgsPage({ initialRows }: AdminOrgsPageProps) {
  const [rows, setRows] = useState(initialRows);
  const [selectedKey, setSelectedKey] = useState<string | null>(initialRows[0] ? `${initialRows[0].type}:${initialRows[0].id}` : null);
  const selectedRow = useMemo(() => rows.find((row) => `${row.type}:${row.id}` === selectedKey) ?? null, [rows, selectedKey]);

  return (
    <AdminWorkbenchPage
      eyebrow="ADMIN ORG WORKBENCH"
      title="組織管理"
      description="病院と救急隊を同一画面で比較し、表示順と有効状態を高密度に調整するための画面です。"
      metrics={
        <>
          <AdminWorkbenchMetric label="TOTAL ORGS" value={rows.length} hint="統合組織数" tone="accent" />
          <AdminWorkbenchMetric label="HOSPITALS" value={rows.filter((row) => row.type === "hospital").length} hint="病院数" />
          <AdminWorkbenchMetric label="EMS TEAMS" value={rows.filter((row) => row.type === "ambulance_team").length} hint="救急隊数" />
          <AdminWorkbenchMetric label="ACTIVE" value={rows.filter((row) => row.isActive).length} hint="有効組織数" tone="warning" />
        </>
      }
    >
      <SplitWorkbenchLayout
        layoutClassName="xl:ds-grid-command-main"
        primary={
          <AdminWorkbenchSection kicker="ORG ROSTER" title="統合一覧" description="病院と救急隊を同一画面で確認し、編集対象を選択します。">
            <div className="space-y-2.5">
              {rows.map((row) => {
                const rowKey = `${row.type}:${row.id}`;
                return <OrgListRow key={rowKey} row={row} selected={rowKey === selectedKey} onSelect={() => setSelectedKey(rowKey)} />;
              })}
            </div>
          </AdminWorkbenchSection>
        }
        secondary={
          selectedRow ? (
            <AdminOrgEditor
              key={`${selectedRow.type}:${selectedRow.id}`}
              row={selectedRow}
              onUpdated={(next) => setRows((prev) => prev.map((row) => (row.type === next.type && row.id === next.id ? next : row)))}
            />
          ) : (
            <AdminWorkbenchSection kicker="ORG EDITOR" title="組織編集" description="一覧から組織を選択すると編集できます。">
              <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">対象組織を選択してください。</p>
            </AdminWorkbenchSection>
          )
        }
      />
    </AdminWorkbenchPage>
  );
}
