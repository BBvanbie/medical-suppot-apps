"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AdminWorkbenchMetric,
  AdminWorkbenchPage,
  AdminWorkbenchSection,
  adminActionButtonClass,
} from "@/components/admin/AdminWorkbench";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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

  return (
    <>
      <div className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-orange-600">USER EDITOR</p>
            <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">ユーザー編集</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">表示名、ロール、所属、有効状態を更新できます。ユーザー名は read-only です。</p>
          </div>
          <SettingSaveStatus status={status} message={statusMessage} />
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-slate-500">ユーザー名</span>
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
              {selectedUser.username}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-slate-500">表示名</span>
            <input
              value={formValues.displayName}
              onChange={(event) => setFormValues((prev) => ({ ...prev, displayName: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
            />
            {fieldErrors.displayName ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.displayName}</span> : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-slate-500">ロール</span>
            <select
              value={formValues.role}
              onChange={(event) => handleRoleChange(event.target.value as UserRole)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
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
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-slate-500">救急隊所属</span>
              <select
                value={formValues.teamId}
                onChange={(event) => setFormValues((prev) => ({ ...prev, teamId: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
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
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-slate-500">病院所属</span>
              <select
                value={formValues.hospitalId}
                onChange={(event) => setFormValues((prev) => ({ ...prev, hospitalId: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
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

          <div className="rounded-[22px] bg-slate-50/85 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">STATUS</p>
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

      <div className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
        <div className="border-b border-slate-200/80 pb-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-orange-600">AUDIT TRAIL</p>
          <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">変更履歴</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">選択中ユーザーの最新 12 件の監査ログを表示します。</p>
        </div>
        <div className="mt-4 space-y-2.5">
          {logs.length === 0 ? <p className="text-sm text-slate-500">履歴はまだありません。</p> : null}
          {logs.map((log) => (
            <div key={log.id} className="rounded-[20px] bg-slate-50/85 px-4 py-4">
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
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
        selected
          ? "border-orange-200 bg-orange-50/70"
          : "border-slate-200 bg-slate-50/70 hover:border-orange-200 hover:bg-orange-50/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold text-slate-950">{row.displayName}</p>
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {roleLabel(row.role)}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
              }`}
            >
              {row.isActive ? "有効" : "無効"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-slate-500">{row.username}</p>
        </div>
        <span className={`${selected ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} shrink-0`}>
          {selected ? "編集中" : "編集"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <div className="rounded-2xl bg-white px-3 py-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">所属</p>
          <p className="mt-1 text-[12px] font-semibold text-slate-800">
            {row.role === "EMS" ? row.teamName || "-" : row.role === "HOSPITAL" ? row.hospitalName || "-" : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">最終ログイン</p>
          <p className="mt-1 text-[12px] font-semibold text-slate-800">{row.lastLoginAt || "-"}</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">作成日</p>
          <p className="mt-1 text-[12px] font-semibold text-slate-800">{row.createdAt}</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">運用メモ</p>
          <p className="mt-1 text-[12px] font-semibold text-slate-800">
            {row.role === "EMS" ? "隊所属を維持" : row.role === "HOSPITAL" ? "病院所属を維持" : "所属なし"}
          </p>
        </div>
      </div>
    </button>
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
          <AdminWorkbenchMetric
            label="ROLE MIX"
            value={`E${roleCounts.EMS} H${roleCounts.HOSPITAL} A${roleCounts.ADMIN} D${roleCounts.DISPATCH}`}
            hint="ロール別内訳"
          />
          <AdminWorkbenchMetric label="POLICY" value="所属整合" hint="EMS=救急隊 / HOSPITAL=病院 / 他=所属なし" tone="warning" />
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.95fr)]">
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

        <div className="space-y-5 self-start xl:sticky xl:top-5">
          {selectedUser ? (
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
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">対象ユーザーを選択してください。</p>
            </AdminWorkbenchSection>
          )}
        </div>
      </div>
    </AdminWorkbenchPage>
  );
}
