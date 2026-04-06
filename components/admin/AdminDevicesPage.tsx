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
import type { AdminAuditLogRow, AdminUserOption } from "@/lib/admin/adminManagementRepository";
import type { AdminDeviceRow } from "@/lib/admin/adminDevicesRepository";

type AdminDevicesPageProps = {
  initialRows: AdminDeviceRow[];
  teamOptions: AdminUserOption[];
  hospitalOptions: AdminUserOption[];
};

function roleLabel(role: AdminDeviceRow["roleScope"]) {
  return role === "EMS" ? "救急隊端末" : "病院端末";
}

function actionLabel(action: string) {
  if (action === "admin.devices.revoke") return "失効";
  if (action === "admin.devices.update") return "更新";
  return action;
}

function AdminDeviceEditor({
  device,
  teamOptions,
  hospitalOptions,
  onUpdated,
}: {
  device: AdminDeviceRow;
  teamOptions: AdminUserOption[];
  hospitalOptions: AdminUserOption[];
  onUpdated: (row: AdminDeviceRow) => void;
}) {
  const [values, setValues] = useState({
    deviceName: device.deviceName,
    roleScope: device.roleScope,
    teamId: device.teamId ? String(device.teamId) : "",
    hospitalId: device.hospitalId ? String(device.hospitalId) : "",
    isLost: device.isLost,
  });
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const [confirmMode, setConfirmMode] = useState<"save" | "revoke" | "activate" | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/devices/${device.id}/logs`)
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
  }, [device.id]);

  const hasChanges =
    values.deviceName !== device.deviceName ||
    values.roleScope !== device.roleScope ||
    values.teamId !== String(device.teamId ?? "") ||
    values.hospitalId !== String(device.hospitalId ?? "") ||
    values.isLost !== device.isLost;

  const runUpdate = async (mode: "save" | "revoke" | "activate") => {
    setStatus("saving");
    setMessage(undefined);

    try {
      const res = await fetch(`/api/admin/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: values.deviceName,
          roleScope: values.roleScope,
          teamId: values.roleScope === "EMS" ? values.teamId || null : null,
          hospitalId: values.roleScope === "HOSPITAL" ? values.hospitalId || null : null,
          isLost: values.isLost,
          isActive: mode === "revoke" ? false : mode === "activate" ? true : device.isActive,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        fieldErrors?: Record<string, string>;
        row?: AdminDeviceRow;
      };

      if (!res.ok || !data.row) {
        setStatus("error");
        setMessage(data.message ?? "端末更新に失敗しました。");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      onUpdated(data.row);
      setStatus("saved");
      setMessage(
        mode === "revoke" ? "端末を失効しました。" : mode === "activate" ? "端末を有効化しました。" : "端末情報を更新しました。",
      );
      setConfirmMode(null);

      const logsRes = await fetch(`/api/admin/devices/${device.id}/logs`);
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
            <p className="text-[10px] font-semibold tracking-[0.18em] text-orange-600">DEVICE EDITOR</p>
            <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">端末編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">端末名、所属、紛失フラグ、有効状態を更新できます。端末コードは read-only です。</p>
          </div>
          <SettingSaveStatus status={status} message={message} />
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <span className="ds-field-label">端末コード</span>
            <div className="ds-field flex items-center bg-[var(--ds-status-neutral-bg)] text-slate-600" aria-readonly="true">{device.deviceCode}</div>
          </div>
          <label className="block">
            <span className="ds-field-label">端末名</span>
            <input
              value={values.deviceName}
              onChange={(event) => setValues((prev) => ({ ...prev, deviceName: event.target.value }))}
              className="ds-field"
            />
            {fieldErrors.deviceName ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.deviceName}</span> : null}
          </label>
          <label className="block">
            <span className="ds-field-label">端末ロール</span>
            <select
              value={values.roleScope}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  roleScope: event.target.value as AdminDeviceRow["roleScope"],
                  teamId: event.target.value === "EMS" ? prev.teamId : "",
                  hospitalId: event.target.value === "HOSPITAL" ? prev.hospitalId : "",
                }))
              }
              className="ds-field"
            >
              <option value="EMS">救急隊端末</option>
              <option value="HOSPITAL">病院端末</option>
            </select>
            {fieldErrors.roleScope ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.roleScope}</span> : null}
          </label>

          {values.roleScope === "EMS" ? (
            <label className="block">
              <span className="ds-field-label">救急隊所属</span>
              <select
                value={values.teamId}
                onChange={(event) => setValues((prev) => ({ ...prev, teamId: event.target.value }))}
                className="ds-field"
              >
                <option value="">選択してください</option>
                {teamOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.teamId ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.teamId}</span> : null}
            </label>
          ) : (
            <label className="block">
              <span className="ds-field-label">病院所属</span>
              <select
                value={values.hospitalId}
                onChange={(event) => setValues((prev) => ({ ...prev, hospitalId: event.target.value }))}
                className="ds-field"
              >
                <option value="">選択してください</option>
                {hospitalOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.hospitalId ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.hospitalId}</span> : null}
            </label>
          )}

          <label className="ds-muted-panel flex items-center justify-between rounded-[22px] px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">紛失フラグ</p>
              <p className="mt-1 text-sm text-slate-500">紛失端末として管理対象に残します。</p>
            </div>
            <input
              type="checkbox"
              checked={values.isLost}
              onChange={(event) => setValues((prev) => ({ ...prev, isLost: event.target.checked }))}
              className="h-5 w-5 accent-orange-600"
            />
          </label>

          <div className="ds-muted-panel rounded-[22px] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">STATUS</p>
                <p className={`mt-1 text-sm font-semibold ${device.isActive ? "text-emerald-700" : "text-slate-500"}`}>{device.isActive ? "有効" : "失効"}</p>
              </div>
              <button type="button" className={adminActionButtonClass(device.isActive ? "secondary" : "primary")} onClick={() => setConfirmMode(device.isActive ? "revoke" : "activate")}>
                {device.isActive ? "即時失効" : "有効化する"}
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
          <p className="text-[10px] font-semibold tracking-[0.18em] text-orange-600">AUDIT TRAIL</p>
          <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">変更履歴</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">選択中端末の最新 12 件の監査ログを表示します。</p>
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

      <ConfirmDialog open={confirmMode === "save"} title="端末情報を更新しますか" description="端末情報の変更内容を保存し、監査ログに記録します。" confirmLabel="保存する" busy={status === "saving"} onCancel={() => setConfirmMode(null)} onConfirm={() => void runUpdate("save")} />
      <ConfirmDialog open={confirmMode === "revoke"} title="端末を失効しますか" description="失効すると、この端末は管理上の利用停止状態になります。危険操作として監査ログに記録されます。" confirmLabel="失効する" busy={status === "saving"} onCancel={() => setConfirmMode(null)} onConfirm={() => void runUpdate("revoke")} />
      <ConfirmDialog open={confirmMode === "activate"} title="端末を有効化しますか" description="有効化すると、この端末は再び利用可能な状態になります。" confirmLabel="有効化する" busy={status === "saving"} onCancel={() => setConfirmMode(null)} onConfirm={() => void runUpdate("activate")} />
    </>
  );
}

function DeviceListRow({ row, selected, onSelect }: { row: AdminDeviceRow; selected: boolean; onSelect: () => void }) {
  return (
    <SelectableRowCard selected={selected} onSelect={onSelect}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold text-slate-950">{row.deviceName}</p>
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">{roleLabel(row.roleScope)}</span>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{row.isActive ? "有効" : "失効"}</span>
            {row.isLost ? <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">紛失</span> : null}
          </div>
          <p className="mt-1 text-[12px] text-slate-500">{row.deviceCode}</p>
        </div>
        <span className={`${selected ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} shrink-0`}>{selected ? "編集中" : "詳細"}</span>
      </div>

      <div className="mt-4">
        <DetailMetadataGrid
          columnsClassName="md:grid-cols-4"
          itemClassName="bg-white"
          items={[
            { label: "所属", value: row.roleScope === "EMS" ? row.teamName || "-" : row.hospitalName || "-" },
            { label: "最終通信", value: row.lastSeenAt ?? "-" },
            { label: "登録日", value: row.createdAt },
            { label: "管理メモ", value: row.isLost ? "紛失管理中" : "通常運用" },
          ]}
        />
      </div>
    </SelectableRowCard>
  );
}

export function AdminDevicesPage({ initialRows, teamOptions, hospitalOptions }: AdminDevicesPageProps) {
  const [rows, setRows] = useState(initialRows);
  const [selectedId, setSelectedId] = useState<number | null>(initialRows[0]?.id ?? null);
  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  return (
    <AdminWorkbenchPage
      eyebrow="ADMIN DEVICE WORKBENCH"
      title="端末管理"
      description="EMS 端末と病院端末を同一画面で追跡し、所属変更、紛失管理、即時失効を高密度に扱う画面です。"
      metrics={
        <>
          <AdminWorkbenchMetric label="TOTAL DEVICES" value={rows.length} hint="登録端末数" tone="accent" />
          <AdminWorkbenchMetric label="ACTIVE" value={rows.filter((row) => row.isActive).length} hint="有効端末数" />
          <AdminWorkbenchMetric label="LOST" value={rows.filter((row) => row.isLost).length} hint="紛失フラグ端末数" tone="warning" />
          <AdminWorkbenchMetric label="SEED" value="初期投入" hint="EMS iPad / 病院受付PC を仮端末として登録" />
        </>
      }
    >
      <SplitWorkbenchLayout
        layoutClassName="xl:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.95fr)]"
        primary={
          <AdminWorkbenchSection kicker="DEVICE ROSTER" title="端末一覧" description="端末種別、所属、状態、最終通信を比較しながら編集対象を選択します。">
            <div className="space-y-2.5">
              {rows.map((row) => <DeviceListRow key={row.id} row={row} selected={row.id === selectedId} onSelect={() => setSelectedId(row.id)} />)}
            </div>
          </AdminWorkbenchSection>
        }
        secondary={
          selected ? (
            <AdminDeviceEditor
              key={selected.id}
              device={selected}
              teamOptions={teamOptions}
              hospitalOptions={hospitalOptions}
              onUpdated={(updatedRow) => setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)))}
            />
          ) : (
            <AdminWorkbenchSection kicker="DEVICE EDITOR" title="端末編集" description="一覧から端末を選択すると編集できます。">
              <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">対象端末を選択してください。</p>
            </AdminWorkbenchSection>
          )
        }
      />
    </AdminWorkbenchPage>
  );
}
