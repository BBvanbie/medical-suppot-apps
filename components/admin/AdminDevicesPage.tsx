"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import { SettingSection } from "@/components/settings/SettingSection";
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
      setMessage(mode === "revoke" ? "端末を失効しました。" : mode === "activate" ? "端末を有効化しました。" : "端末情報を更新しました。");
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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">端末編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">端末名、所属、紛失フラグ、有効状態を更新できます。端末コードは readOnly です。</p>
          </div>
          <SettingSaveStatus status={status} message={message} />
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">端末コード</span>
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{device.deviceCode}</div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">端末名</span>
            <input
              value={values.deviceName}
              onChange={(event) => setValues((prev) => ({ ...prev, deviceName: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
            />
            {fieldErrors.deviceName ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.deviceName}</span> : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">端末ロール</span>
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
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
            >
              <option value="EMS">救急隊端末</option>
              <option value="HOSPITAL">病院端末</option>
            </select>
            {fieldErrors.roleScope ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.roleScope}</span> : null}
          </label>

          {values.roleScope === "EMS" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">救急隊所属</span>
              <select
                value={values.teamId}
                onChange={(event) => setValues((prev) => ({ ...prev, teamId: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
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
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">病院所属</span>
              <select
                value={values.hospitalId}
                onChange={(event) => setValues((prev) => ({ ...prev, hospitalId: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
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

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">紛失フラグ</p>
              <p className="mt-1 text-sm text-slate-500">紛失端末として管理対象に残します。</p>
            </div>
            <input
              type="checkbox"
              checked={values.isLost}
              onChange={(event) => setValues((prev) => ({ ...prev, isLost: event.target.checked }))}
              className="h-5 w-5 accent-amber-600"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">状態</span>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className={`text-sm font-semibold ${device.isActive ? "text-emerald-700" : "text-slate-500"}`}>{device.isActive ? "有効" : "失効"}</span>
              <SettingActionButton tone={device.isActive ? "danger" : "secondary"} className="h-9 px-3 text-xs" onClick={() => setConfirmMode(device.isActive ? "revoke" : "activate")}>
                {device.isActive ? "即時失効" : "有効化する"}
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
        <p className="mt-1 text-sm leading-6 text-slate-600">選択中端末の最新 12 件の監査ログを表示します。</p>
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
        title="端末情報を更新しますか"
        description="端末情報の変更内容を保存し、監査ログに記録します。"
        confirmLabel="保存する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("save")}
      />
      <ConfirmDialog
        open={confirmMode === "revoke"}
        title="端末を失効しますか"
        description="失効すると、この端末は管理上の利用停止状態になります。危険操作として監査ログに記録されます。"
        confirmLabel="失効する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("revoke")}
      />
      <ConfirmDialog
        open={confirmMode === "activate"}
        title="端末を有効化しますか"
        description="有効化すると、この端末は再び利用可能な状態になります。"
        confirmLabel="有効化する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("activate")}
      />
    </>
  );
}

export function AdminDevicesPage({ initialRows, teamOptions, hospitalOptions }: AdminDevicesPageProps) {
  const [rows, setRows] = useState(initialRows);
  const [selectedId, setSelectedId] = useState<number | null>(initialRows[0]?.id ?? null);
  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  return (
    <SettingPageLayout eyebrow="ADMIN MANAGEMENT" title="端末管理" description="EMS 端末と病院端末を一元管理し、所属変更、紛失管理、即時失効を行います。">
      <section className="grid gap-4 xl:grid-cols-4">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">TOTAL</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.length}</p>
          <p className="mt-2 text-sm text-slate-500">登録端末数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">ACTIVE</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.filter((row) => row.isActive).length}</p>
          <p className="mt-2 text-sm text-slate-500">有効端末数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">LOST</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.filter((row) => row.isLost).length}</p>
          <p className="mt-2 text-sm text-slate-500">紛失フラグ端末数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">SEED</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">仮端末を初期投入</p>
          <p className="mt-2 text-sm text-slate-500">EMS は iPad、病院は受付 PC を初期端末として登録します。</p>
        </SettingCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <SettingSection title="端末一覧" description="対象端末を選択して詳細を編集できます。">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["端末コード", "端末名", "端末種別", "所属", "状態", "最終通信"].map((label) => (
                      <th key={label} className="px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-500">
                        {label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-[0.12em] text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className={row.id === selectedId ? "bg-amber-50/60" : ""}>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.deviceCode}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.deviceName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{roleLabel(row.roleScope)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.roleScope === "EMS" ? row.teamName || "-" : row.hospitalName || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {row.isActive ? "有効" : "失効"}
                          </span>
                          {row.isLost ? <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">紛失</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.lastSeenAt ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <SettingActionButton tone={row.id === selectedId ? "primary" : "secondary"} className="h-9 px-3 text-xs" onClick={() => setSelectedId(row.id)}>
                          {row.id === selectedId ? "選択中" : "詳細"}
                        </SettingActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SettingSection>

        <div className="space-y-6">
          {selected ? (
            <AdminDeviceEditor
              key={selected.id}
              device={selected}
              teamOptions={teamOptions}
              hospitalOptions={hospitalOptions}
              onUpdated={(updatedRow) => setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)))}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">端末編集</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">一覧から端末を選択すると編集できます。</p>
            </div>
          )}
        </div>
      </div>
    </SettingPageLayout>
  );
}
