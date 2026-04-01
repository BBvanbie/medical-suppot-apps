"use client";

import { useMemo, useState, useTransition } from "react";

import {
  AdminWorkbenchMetric,
  AdminWorkbenchPage,
  AdminWorkbenchSection,
  adminActionButtonClass,
} from "@/components/admin/AdminWorkbench";
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
  const actionCount = new Set(logs.map((log) => actionLabel(log.action))).size;

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
    <AdminWorkbenchPage
      eyebrow="ADMIN AUDIT WORKBENCH"
      title="監査ログ"
      description="対象、操作、実行ロール、変更内容を一画面で追跡し、管理操作の流れをすばやく検証するための画面です。"
      action={
        <button type="button" onClick={runSearch} disabled={isPending} className={adminActionButtonClass("primary")}>
          {isPending ? "再読込中..." : "ログを更新"}
        </button>
      }
      metrics={
        <>
          <AdminWorkbenchMetric label="VISIBLE LOGS" value={logs.length} hint="現在の表示件数" tone="accent" />
          <AdminWorkbenchMetric
            label="TARGET FILTER"
            value={targetType ? targetTypeLabel(targetType) : "全対象"}
            hint="対象種別の絞り込み"
          />
          <AdminWorkbenchMetric
            label="ACTION FILTER"
            value={action ? actionLabel(action) : "全操作"}
            hint={`${actionCount}種類の操作を表示`}
          />
          <AdminWorkbenchMetric
            label="QUERY"
            value={query.trim() || "未指定"}
            hint="target_id / action / actor_role を検索"
            tone="warning"
          />
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(400px,0.95fr)]">
        <div className="min-w-0 space-y-5">
          <AdminWorkbenchSection
            kicker="LOG FILTERS"
            title="検索条件"
            description="対象種別、操作種別、キーワードを組み合わせて管理操作を絞り込みます。"
          >
            <div className="grid gap-3 md:grid-cols-[170px_220px_minmax(0,1fr)_140px]">
              <select
                value={targetType}
                onChange={(event) => setTargetType(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
              >
                {targetTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="target_id / action / actor_role を検索"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300"
              />
              <button type="button" onClick={runSearch} disabled={isPending} className={adminActionButtonClass("secondary")}>
                {isPending ? "検索中..." : "検索"}
              </button>
            </div>
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="AUDIT STREAM"
            title="ログ一覧"
            description="対象、操作、実行ロール、時刻を同じ行で比較しながら選択します。"
          >
            <div className="space-y-2.5">
              {logs.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">該当する監査ログはありません。</p>
              ) : (
                logs.map((log) => {
                  const selected = log.id === selectedLogId;
                  return (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => setSelectedLogId(log.id)}
                      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                        selected
                          ? "border-orange-200 bg-orange-50/70"
                          : "border-slate-200 bg-slate-50/70 hover:border-orange-200 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              {targetTypeLabel(log.targetType)}
                            </span>
                            <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                              {actionLabel(log.action)}
                            </span>
                          </div>
                          <p className="mt-2 text-[14px] font-semibold text-slate-950">{log.targetId ?? "-"}</p>
                          <p className="mt-1 text-[12px] text-slate-500">{log.createdAt}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-right">
                          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">ACTOR ROLE</p>
                          <p className="mt-1 text-[12px] font-semibold text-slate-800">{log.actorRole}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </AdminWorkbenchSection>
        </div>

        <AdminWorkbenchSection
          kicker="LOG DETAIL"
          title={selectedLog ? actionLabel(selectedLog.action) : "ログ詳細"}
          description={selectedLog ? `${targetTypeLabel(selectedLog.targetType)} / ${selectedLog.targetId ?? "-"}` : "一覧からログを選択してください。"}
          className="self-start xl:sticky xl:top-5"
        >
          {!selectedLog ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">一覧からログを選択してください。</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">日時</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">{selectedLog.createdAt}</p>
                </div>
                <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">実行ロール</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">{selectedLog.actorRole}</p>
                </div>
                <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">対象種別</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">{targetTypeLabel(selectedLog.targetType)}</p>
                </div>
                <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">対象ID</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">{selectedLog.targetId ?? "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">変更前</p>
                <pre className="mt-2 overflow-auto rounded-[22px] border border-slate-200 bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100">
                  {toPrettyJson(selectedLog.beforeJson)}
                </pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">変更後</p>
                <pre className="mt-2 overflow-auto rounded-[22px] border border-slate-200 bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100">
                  {toPrettyJson(selectedLog.afterJson)}
                </pre>
              </div>
            </div>
          )}
        </AdminWorkbenchSection>
      </div>
    </AdminWorkbenchPage>
  );
}
