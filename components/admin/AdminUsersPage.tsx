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
    case "security.login.unlock":
      return "ロック解除";
    case "security.password.issueTemporary":
      return "一時パスワード発行";
    case "security.password.change":
      return "パスワード変更";
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
  const [issuedTemporaryPassword, setIssuedTemporaryPassword] = useState<{ password: string; expiresAt: string } | null>(null);

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
      setStatusMessage(
        mode === "activate"
          ? "ユーザーを有効化しました。"
          : mode === "deactivate"
            ? "ユーザーを無効化しました。"
            : "ユーザー情報を更新しました。",
      );
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

  const unlockUser = async () => {
    setStatus("saving");
    setStatusMessage(undefined);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/unlock`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setStatus("error");
        setStatusMessage(data.message ?? "ロック解除に失敗しました。");
        return;
      }
      onUpdated({ ...selectedUser, lockedUntil: null });
      setStatus("saved");
      setStatusMessage("ログインロックを解除しました。");
    } catch {
      setStatus("error");
      setStatusMessage("通信に失敗しました。");
    }
  };

  const issueTemporaryPassword = async () => {
    setStatus("saving");
    setStatusMessage(undefined);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/temporary-password`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string; temporaryPassword?: string; expiresAt?: string };
      if (!res.ok || !data.temporaryPassword || !data.expiresAt) {
        setStatus("error");
        setStatusMessage(data.message ?? "一時パスワード発行に失敗しました。");
        return;
      }
      setIssuedTemporaryPassword({ password: data.temporaryPassword, expiresAt: data.expiresAt });
      onUpdated({
        ...selectedUser,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: data.expiresAt,
      });
      setStatus("saved");
      setStatusMessage("一時パスワードを発行しました。");
    } catch {
      setStatus("error");
      setStatusMessage("通信に失敗しました。");
    }
  };

  return (
    <>
      <div className="ds-panel-surface px-5 py-5">
        <div className="ds-panel-header flex items-start justify-between gap-4 pb-4">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-orange-600">USER EDITOR</p>
            <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">ユーザー編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">表示名、ロール、所属、有効状態を更新できます。ユーザー名は read-only です。</p>
          </div>
          <SettingSaveStatus status={status} message={statusMessage} />
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <span className="ds-field-label">ユーザー名</span>
            <div className="ds-field flex items-center ds-bg-neutral text-slate-600" aria-readonly="true">
              {selectedUser.username}
            </div>
          </div>
          <label className="block">
            <span className="ds-field-label">表示名</span>
            <input
              value={formValues.displayName}
              onChange={(event) => setFormValues((prev) => ({ ...prev, displayName: event.target.value }))}
              className="ds-field"
            />
            {fieldErrors.displayName ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.displayName}</span> : null}
          </label>
          <label className="block">
            <span className="ds-field-label">ロール</span>
            <select
              value={formValues.role}
              onChange={(event) => handleRoleChange(event.target.value as UserRole)}
              className="ds-field"
            >
              <option value="EMS">救急隊</option>
              <option value="HOSPITAL">病院</option>
              <option value="ADMIN">管理者</option>
              <option value="DISPATCH">指令</option>
            </select>
            {fieldErrors.role ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.role}</span> : null}
          </label>

          {formValues.role === "EMS" ? (
            <label className="block">
              <span className="ds-field-label">救急隊所属</span>
              <select
                value={formValues.teamId}
                onChange={(event) => setFormValues((prev) => ({ ...prev, teamId: event.target.value }))}
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
          ) : null}

          {formValues.role === "HOSPITAL" ? (
            <label className="block">
              <span className="ds-field-label">病院所属</span>
              <select
                value={formValues.hospitalId}
                onChange={(event) => setFormValues((prev) => ({ ...prev, hospitalId: event.target.value }))}
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
          ) : null}

          <div className="ds-muted-panel ds-radius-command px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">STATUS</p>
                <p className={`mt-1 text-sm font-semibold ${selectedUser.isActive ? "text-emerald-700" : "text-slate-500"}`}>
                  {selectedUser.isActive ? "有効" : "無効"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmMode(selectedUser.isActive ? "deactivate" : "activate")}
                className={adminActionButtonClass(selectedUser.isActive ? "secondary" : "primary")}
              >
                {selectedUser.isActive ? "無効化する" : "有効化する"}
              </button>
            </div>
          </div>

          <div className="ds-muted-panel ds-radius-command px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">SECURITY</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedUser.lockedUntil ? `ログインロック中: ${selectedUser.lockedUntil}` : "ログインロックなし"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedUser.mustChangePassword
                    ? `一時パスワード有効期限: ${selectedUser.temporaryPasswordExpiresAt ?? "-"}`
                    : "一時パスワード未発行"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={adminActionButtonClass("secondary")} onClick={() => void unlockUser()}>
                  ロック解除
                </button>
                <button type="button" className={adminActionButtonClass("primary")} onClick={() => void issueTemporaryPassword()}>
                  一時PASS発行
                </button>
              </div>
            </div>
            {issuedTemporaryPassword ? (
              <div className="mt-3 rounded-2xl border border-orange-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold ds-track-section text-orange-700">TEMPORARY PASSWORD</p>
                <p className="mt-1 text-lg font-bold ds-track-password text-slate-950" data-testid="admin-user-issued-temp-password">{issuedTemporaryPassword.password}</p>
                <p className="mt-1 text-xs text-slate-500">有効期限: {issuedTemporaryPassword.expiresAt}</p>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!hasChanges || status === "saving"}
              onClick={() => setConfirmMode("save")}
              className={adminActionButtonClass("primary")}
            >
              変更を保存
            </button>
          </div>
        </div>
      </div>

      <div className="ds-panel-surface px-5 py-5">
        <div className="ds-panel-header pb-4">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-orange-600">AUDIT TRAIL</p>
          <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">変更履歴</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">選択中ユーザーの最新 12 件の監査ログを表示します。</p>
        </div>
        <AuditTrailList
          items={logs.map((log) => ({
            id: log.id,
            title: getActionLabel(log.action),
            timestamp: log.createdAt,
            actorRole: log.actorRole,
          }))}
        />
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

function UserListRow({
  row,
  selected,
  onSelect,
}: {
  row: AdminUserRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <SelectableRowCard selected={selected} onSelect={onSelect}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="ds-text-md font-bold text-slate-950">{row.displayName}</p>
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 ds-text-xs-compact font-semibold text-slate-700">
              {roleLabel(row.role)}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 ds-text-xs-compact font-semibold ${
                row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
              }`}
            >
              {row.isActive ? "有効" : "無効"}
            </span>
            {row.lockedUntil ? <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 ds-text-xs-compact font-semibold text-rose-700">ロック中</span> : null}
            {row.mustChangePassword ? <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 ds-text-xs-compact font-semibold text-amber-700">PASS変更待ち</span> : null}
          </div>
          <p className="mt-1 ds-text-xs-plus text-slate-500">{row.username}</p>
        </div>
        <span className={`${selected ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} shrink-0`}>
          {selected ? "編集中" : "編集"}
        </span>
      </div>

      <div className="mt-4">
        <DetailMetadataGrid
          columnsClassName="md:grid-cols-4"
          itemClassName="bg-white"
          items={[
            {
              label: "所属",
              value: row.role === "EMS" ? row.teamName || "-" : row.role === "HOSPITAL" ? row.hospitalName || "-" : "-",
            },
            { label: "最終ログイン", value: row.lastLoginAt || "-" },
            { label: "ロック状態", value: row.lockedUntil || "-" },
            {
              label: "運用メモ",
              value: row.mustChangePassword ? "パスワード変更待ち" : row.role === "EMS" ? "隊所属を維持" : row.role === "HOSPITAL" ? "病院所属を維持" : "所属なし",
            },
          ]}
        />
      </div>
    </SelectableRowCard>
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
    <AdminWorkbenchPage
      eyebrow="ADMIN USER WORKBENCH"
      title="ユーザー管理"
      description="ロール、所属、有効状態を高密度に比較しながら、対象ユーザーの編集と監査確認を同時に行う画面です。"
      metrics={
        <>
          <AdminWorkbenchMetric label="TOTAL USERS" value={totalCount} hint="登録ユーザー数" tone="accent" />
          <AdminWorkbenchMetric label="ACTIVE USERS" value={activeCount} hint="現在有効なユーザー数" />
          <AdminWorkbenchMetric label="LOCKED" value={rows.filter((row) => row.lockedUntil).length} hint="ログインロック中" tone="warning" />
          <AdminWorkbenchMetric
            label="ROLE MIX"
            value={`E${roleCounts.EMS} H${roleCounts.HOSPITAL} A${roleCounts.ADMIN} D${roleCounts.DISPATCH}`}
            hint="ロール別内訳"
          />
          <AdminWorkbenchMetric label="POLICY" value="所属整合" hint="EMS=救急隊 / HOSPITAL=病院 / 他=所属なし" tone="warning" />
        </>
      }
    >
      <SplitWorkbenchLayout
        layoutClassName="xl:ds-grid-command-main"
        primary={
          <AdminWorkbenchSection
            kicker="USER ROSTER"
            title="ユーザー一覧"
            description="一覧から対象ユーザーを選択し、編集面でロールと所属の整合を確認します。"
          >
            <div className="space-y-2.5">
              {rows.map((row) => (
                <UserListRow
                  key={row.id}
                  row={row}
                  selected={row.id === selectedUserId}
                  onSelect={() => setSelectedUserId(row.id)}
                />
              ))}
            </div>
          </AdminWorkbenchSection>
        }
        secondary={
          selectedUser ? (
            <AdminUserEditorPanel
              key={selectedUser.id}
              selectedUser={selectedUser}
              teamOptions={teamOptions}
              hospitalOptions={hospitalOptions}
              onUpdated={(updatedRow) =>
                setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)))
              }
            />
          ) : (
            <AdminWorkbenchSection kicker="USER EDITOR" title="ユーザー編集" description="一覧からユーザーを選択すると編集できます。">
              <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">対象ユーザーを選択してください。</p>
            </AdminWorkbenchSection>
          )
        }
      />
    </AdminWorkbenchPage>
  );
}
