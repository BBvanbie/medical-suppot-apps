"use client";

import { useMemo, useState, useTransition } from "react";

import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import type { AdminAuditLogRow } from "@/lib/admin/adminManagementRepository";

type AdminLogsPageProps = {
  initialLogs: AdminAuditLogRow[];
};

const targetTypeOptions = [
  { label: "すべて", value: "" },
  { label: "ユーザー", value: "user" },
  { label: "端末", value: "device" },
  { label: "病院", value: "hospital" },
  { label: "救急隊", value: "ambulance_team" },
] as const;

const actionOptions = [
  { label: "すべて", value: "" },
  { label: "更新", value: "update" },
  { label: "有効状態変更", value: "toggleActive" },
  { label: "失効", value: "revoke" },
  { label: "ロール変更", value: "changeRole" },
] as const;

function toPrettyJson(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : "-";
}

function actionLabel(action: string) {
  if (action.includes("toggleActive")) return "有効状態変更";
  if (action.includes("changeRole")) return "ロール変更";
  if (action.includes("revoke")) return "失効";
  if (action.includes("update")) return "更新";
  if (action.includes("create")) return "追加";
  return action;
}

function targetTypeLabel(targetType?: string) {
  if (targetType === "user") return "ユーザー";
  if (targetType === "device") return "端末";
  if (targetType === "hospital") return "病院";
  if (targetType === "ambulance_team") return "救急隊";
  return targetType ?? "-";
}

export function AdminLogsPage({ initialLogs }: AdminLogsPageProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(initialLogs[0]?.id ?? null);
  const [targetType, setTargetType] = useState("");
  const [action, setAction] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedLog = useMemo(() => logs.find((log) => log.id === selectedLogId) ?? null, [logs, selectedLogId]);

  const runSearch = () => {
    const params = new URLSearchParams();
    if (targetType) params.set("targetType", targetType);
    if (action) params.set("action", action);
    if (query.trim()) params.set("query", query.trim());

    startTransition(async () => {
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { logs: AdminAuditLogRow[] };
      setLogs(data.logs);
      setSelectedLogId(data.logs[0]?.id ?? null);
    });
  };

  return (
    <SettingPageLayout eyebrow="ADMIN MANAGEMENT" title="監査ログ" description="管理操作の監査ログを一覧・絞り込み・詳細表示で確認します。">
      <section className="grid gap-4 xl:grid-cols-3">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">TOTAL</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{logs.length}</p>
          <p className="mt-2 text-sm text-slate-500">表示中のログ件数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">FILTER</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{targetType ? targetTypeLabel(targetType) : "対象種別: すべて"}</p>
          <p className="mt-2 text-sm text-slate-500">{action ? `操作: ${action}` : "操作種別: すべて"}</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">DETAIL</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">変更前後の JSON を確認</p>
          <p className="mt-2 text-sm text-slate-500">対象別の監査情報を詳細パネルで確認できます。</p>
        </SettingCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <SettingSection title="ログ一覧" description="対象種別、操作種別、キーワードで絞り込めます。">
          <div className="mb-4 grid gap-3 md:grid-cols-[160px_220px_minmax(0,1fr)_120px]">
            <select value={targetType} onChange={(event) => setTargetType(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500">
              {targetTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select value={action} onChange={(event) => setAction(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500">
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="target_id / action / actor_role を検索"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500"
            />
            <SettingActionButton disabled={isPending} onClick={runSearch}>
              {isPending ? "検索中..." : "検索"}
            </SettingActionButton>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["日時", "対象種別", "対象ID", "操作", "実行ロール"].map((label) => (
                      <th key={label} className="px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-500">{label}</th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-[0.12em] text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">該当する監査ログはありません。</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className={log.id === selectedLogId ? "bg-amber-50/60" : ""}>
                        <td className="px-4 py-3 text-sm text-slate-700">{log.createdAt}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{targetTypeLabel(log.targetType)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{log.targetId ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{actionLabel(log.action)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{log.actorRole}</td>
                        <td className="px-4 py-3 text-right">
                          <SettingActionButton tone={log.id === selectedLogId ? "primary" : "secondary"} className="h-9 px-3 text-xs" onClick={() => setSelectedLogId(log.id)}>
                            {log.id === selectedLogId ? "選択中" : "詳細"}
                          </SettingActionButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SettingSection>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <h3 className="text-lg font-bold text-slate-900">ログ詳細</h3>
          {!selectedLog ? (
            <p className="mt-4 text-sm text-slate-500">一覧からログを選択してください。</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">日時</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedLog.createdAt}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">実行ロール</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedLog.actorRole}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">対象種別</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{targetTypeLabel(selectedLog.targetType)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">対象ID</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedLog.targetId ?? "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">変更前</p>
                <pre className="mt-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">{toPrettyJson(selectedLog.beforeJson)}</pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">変更後</p>
                <pre className="mt-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">{toPrettyJson(selectedLog.afterJson)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingPageLayout>
  );
}
