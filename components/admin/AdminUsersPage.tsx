"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import { SettingSection } from "@/components/settings/SettingSection";
import type { AdminAuditLogRow, AdminUserOption, AdminUserRow } from "@/lib/admin/adminManagementRepository";

type AdminUsersPageProps = {
  initialRows: AdminUserRow[];
  teamOptions: AdminUserOption[];
  hospitalOptions: AdminUserOption[];
};

type UserRole = AdminUserRow["role"];

function roleLabel(role: UserRole) {
  if (role === "EMS") return "救急隊";
  if (role === "HOSPITAL") return "病院";
  if (role === "DISPATCH") return "指令";
  return "管理者";
}

function getActionLabel(action: string) {
  switch (action) {
    case "admin.users.update":
      return "更新";
    case "admin.users.toggleActive":
      return "有効状態変更";
    case "admin.users.changeRole":
      return "ロール変更";
    default:
      return action;
  }
}

type AdminUserEditorPanelProps = {
  selectedUser: AdminUserRow;
  teamOptions: AdminUserOption[];
  hospitalOptions: AdminUserOption[];
  onUpdated: (row: AdminUserRow) => void;
};

function AdminUserEditorPanel({ selectedUser, teamOptions, hospitalOptions, onUpdated }: AdminUserEditorPanelProps) {
  const [formValues, setFormValues] = useState({
    displayName: selectedUser.displayName,
    role: selectedUser.role as UserRole,
    teamId: selectedUser.teamId ? String(selectedUser.teamId) : "",
    hospitalId: selectedUser.hospitalId ? String(selectedUser.hospitalId) : "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>();
  const [confirmMode, setConfirmMode] = useState<"save" | "activate" | "deactivate" | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/users/${selectedUser.id}/logs`)
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
  }, [selectedUser.id]);

  const hasChanges =
    selectedUser.displayName !== formValues.displayName ||
    selectedUser.role !== formValues.role ||
    String(selectedUser.teamId ?? "") !== formValues.teamId ||
    String(selectedUser.hospitalId ?? "") !== formValues.hospitalId;

  const handleRoleChange = (role: UserRole) => {
    setFormValues((prev) => ({
      ...prev,
      role,
      teamId: role === "EMS" ? prev.teamId : "",
      hospitalId: role === "HOSPITAL" ? prev.hospitalId : "",
    }));
  };

  const runUpdate = async (mode: "save" | "activate" | "deactivate") => {
    setStatus("saving");
    setStatusMessage(undefined);

    const body = {
      displayName: formValues.displayName,
      role: formValues.role,
      teamId: formValues.role === "EMS" ? formValues.teamId || null : null,
      hospitalId: formValues.role === "HOSPITAL" ? formValues.hospitalId || null : null,
      isActive: mode === "activate" ? true : mode === "deactivate" ? false : selectedUser.isActive,
    };

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        fieldErrors?: Record<string, string>;
        row?: AdminUserRow;
      };

      if (!res.ok || !data.row) {
        setStatus("error");
        setStatusMessage(data.message ?? "更新に失敗しました。");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      onUpdated(data.row);
      setStatus("saved");
      setStatusMessage(mode === "activate" ? "ユーザーを有効化しました。" : mode === "deactivate" ? "ユーザーを無効化しました。" : "ユーザー情報を更新しました。");
      setConfirmMode(null);

      const logsRes = await fetch(`/api/admin/users/${data.row.id}/logs`);
      if (logsRes.ok) {
        const logsData = (await logsRes.json()) as { logs: AdminAuditLogRow[] };
        setLogs(logsData.logs);
      }
    } catch {
      setStatus("error");
      setStatusMessage("通信に失敗しました。");
    }
  };

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">ユーザー編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">表示名、ロール、所属、有効状態を更新できます。ユーザー名は readOnly です。</p>
          </div>
          <SettingSaveStatus status={status} message={statusMessage} />
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">ユーザー名</span>
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{selectedUser.username}</div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">表示名</span>
            <input
              value={formValues.displayName}
              onChange={(event) => setFormValues((prev) => ({ ...prev, displayName: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
            />
            {fieldErrors.displayName ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.displayName}</span> : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">ロール</span>
            <select value={formValues.role} onChange={(event) => handleRoleChange(event.target.value as UserRole)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500">
              <option value="EMS">救急隊</option>
              <option value="HOSPITAL">病院</option>
              <option value="ADMIN">管理者</option>
              <option value="DISPATCH">指令</option>
            </select>
            {fieldErrors.role ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.role}</span> : null}
          </label>

          {formValues.role === "EMS" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">救急隊所属</span>
              <select value={formValues.teamId} onChange={(event) => setFormValues((prev) => ({ ...prev, teamId: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500">
                <option value="">選択してください</option>
                {teamOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {fieldErrors.teamId ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.teamId}</span> : null}
            </label>
          ) : null}

          {formValues.role === "HOSPITAL" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">病院所属</span>
              <select value={formValues.hospitalId} onChange={(event) => setFormValues((prev) => ({ ...prev, hospitalId: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500">
                <option value="">選択してください</option>
                {hospitalOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {fieldErrors.hospitalId ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.hospitalId}</span> : null}
            </label>
          ) : null}

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">状態</span>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className={`text-sm font-semibold ${selectedUser.isActive ? "text-emerald-700" : "text-slate-500"}`}>{selectedUser.isActive ? "有効" : "無効"}</span>
              <SettingActionButton tone={selectedUser.isActive ? "danger" : "secondary"} className="h-9 px-3 text-xs" onClick={() => setConfirmMode(selectedUser.isActive ? "deactivate" : "activate")}>
                {selectedUser.isActive ? "無効化する" : "有効化する"}
              </SettingActionButton>
            </div>
          </div>

          <div className="flex justify-end">
            <SettingActionButton disabled={!hasChanges || status === "saving"} onClick={() => setConfirmMode("save")}>変更を保存</SettingActionButton>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <h3 className="text-lg font-bold text-slate-900">変更履歴</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">選択中ユーザーの最新 12 件の監査ログを表示します。</p>
        <div className="mt-5 space-y-3">
          {logs.length === 0 ? <p className="text-sm text-slate-500">履歴はまだありません。</p> : null}
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{getActionLabel(log.action)}</p>
                <p className="text-xs text-slate-500">{log.createdAt}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">実行ロール: {log.actorRole}</p>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmMode === "save"}
        title="ユーザー情報を更新しますか"
        description="表示名、ロール、所属の変更内容を保存し、監査ログに記録します。"
        confirmLabel="保存する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("save")}
      />
      <ConfirmDialog
        open={confirmMode === "activate"}
        title="ユーザーを有効化しますか"
        description="有効化すると、このユーザーは再びログイン可能な状態になります。"
        confirmLabel="有効化する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("activate")}
      />
      <ConfirmDialog
        open={confirmMode === "deactivate"}
        title="ユーザーを無効化しますか"
        description="無効化すると、このユーザーはログインできなくなります。"
        confirmLabel="無効化する"
        busy={status === "saving"}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void runUpdate("deactivate")}
      />
    </>
  );
}

export function AdminUsersPage({ initialRows, teamOptions, hospitalOptions }: AdminUsersPageProps) {
  const [rows, setRows] = useState(initialRows);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialRows[0]?.id ?? null);

  const selectedUser = useMemo(() => rows.find((row) => row.id === selectedUserId) ?? null, [rows, selectedUserId]);
  const totalCount = rows.length;
  const activeCount = rows.filter((row) => row.isActive).length;
  const roleCounts = {
    EMS: rows.filter((row) => row.role === "EMS").length,
    HOSPITAL: rows.filter((row) => row.role === "HOSPITAL").length,
    ADMIN: rows.filter((row) => row.role === "ADMIN").length,
    DISPATCH: rows.filter((row) => row.role === "DISPATCH").length,
  };

  return (
    <SettingPageLayout eyebrow="ADMIN MANAGEMENT" title="ユーザー管理" description="ユーザー一覧の確認、表示名・ロール・所属・有効状態の変更を行います。">
      <section className="grid gap-4 xl:grid-cols-4">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">TOTAL</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalCount}</p>
          <p className="mt-2 text-sm text-slate-500">登録ユーザー数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">ACTIVE</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{activeCount}</p>
          <p className="mt-2 text-sm text-slate-500">有効ユーザー数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">ROLES</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">EMS {roleCounts.EMS} / HOSPITAL {roleCounts.HOSPITAL} / ADMIN {roleCounts.ADMIN} / DISPATCH {roleCounts.DISPATCH}</p>
          <p className="mt-2 text-sm text-slate-500">ロール別内訳</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">POLICY</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">ロールと所属を整合させる</p>
          <p className="mt-2 text-sm text-slate-500">EMS は救急隊所属、HOSPITAL は病院所属、ADMIN と DISPATCH は所属なしで管理します。</p>
        </SettingCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <SettingSection title="ユーザー一覧" description="対象ユーザーを選択して詳細を編集できます。">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["ユーザー名", "表示名", "ロール", "所属", "状態"].map((label) => (
                      <th
                        key={label}
                        className={`px-4 py-3 text-xs font-semibold tracking-[0.12em] text-slate-500 ${
                          label === "ロール"
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
                  {rows.map((row) => (
                    <tr key={row.id} className={row.id === selectedUserId ? "bg-amber-50/60" : ""}>
                      <td className="px-4 py-1.5 text-sm text-slate-700">{row.username}</td>
                      <td className="px-4 py-1.5 text-sm text-slate-700">{row.displayName}</td>
                      <td className="w-[5.5rem] min-w-[5.5rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">{roleLabel(row.role)}</td>
                      <td className="px-4 py-1.5 text-sm text-slate-700">{row.role === "EMS" ? row.teamName || "-" : row.role === "HOSPITAL" ? row.hospitalName || "-" : "-"}</td>
                      <td className="w-[5.5rem] min-w-[5.5rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">
                        <div className="flex justify-center">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {row.isActive ? "有効" : "無効"}
                          </span>
                        </div>
                      </td>
                      <td className="w-[6rem] min-w-[6rem] whitespace-nowrap px-4 py-1.5 text-sm text-slate-700">
                        <div className="flex justify-center">
                          <SettingActionButton tone={row.id === selectedUserId ? "primary" : "secondary"} className="h-7 whitespace-nowrap px-3 text-xs" onClick={() => setSelectedUserId(row.id)}>
                            {row.id === selectedUserId ? "選択中" : "詳細"}
                          </SettingActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SettingSection>

        <div className="space-y-6 self-start xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1">
          {selectedUser ? (
            <AdminUserEditorPanel
              key={selectedUser.id}
              selectedUser={selectedUser}
              teamOptions={teamOptions}
              hospitalOptions={hospitalOptions}
              onUpdated={(updatedRow) => setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)))}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">ユーザー編集</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">一覧からユーザーを選択すると編集できます。</p>
            </div>
          )}
        </div>
      </div>
    </SettingPageLayout>
  );
}
