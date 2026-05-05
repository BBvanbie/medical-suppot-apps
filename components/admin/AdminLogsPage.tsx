"use client";

import { useMemo, useState, useTransition } from "react";

import {
  AdminWorkbenchMetric,
  AdminWorkbenchPage,
  AdminWorkbenchSection,
  adminActionButtonClass,
} from "@/components/admin/AdminWorkbench";
import { DetailMetadataGrid } from "@/components/shared/DetailMetadataGrid";
import { SelectableRowCard } from "@/components/shared/SelectableRowCard";
import { SplitWorkbenchLayout } from "@/components/shared/SplitWorkbenchLayout";
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
      <SplitWorkbenchLayout
        layoutClassName="ds-grid-xl-admin-logs-main"
        primary={
          <>
          <AdminWorkbenchSection
            kicker="LOG FILTERS"
            title="検索条件"
            description="対象種別、操作種別、キーワードを組み合わせて管理操作を絞り込みます。"
          >
            <div className="grid gap-3 ds-grid-md-admin-log-filter">
              <select
                value={targetType}
                onChange={(event) => setTargetType(event.target.value)}
                className="ds-field"
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
                className="ds-field"
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
                className="ds-field"
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
                <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">該当する監査ログはありません。</p>
              ) : (
                logs.map((log) => {
                  const selected = log.id === selectedLogId;
                  return (
                    <SelectableRowCard key={log.id} selected={selected} onSelect={() => setSelectedLogId(log.id)}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-white px-2.5 py-1 ds-text-xs-compact font-semibold text-slate-700">
                              {targetTypeLabel(log.targetType)}
                            </span>
                            <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 ds-text-xs-compact font-semibold text-white">
                              {actionLabel(log.action)}
                            </span>
                          </div>
                          <p className="mt-2 ds-text-sm-plus font-semibold text-slate-950">{log.targetId ?? "-"}</p>
                          <p className="mt-1 ds-text-xs-plus text-slate-500">{log.createdAt}</p>
                        </div>
                        <div className="ds-muted-panel px-3 py-2 text-right">
                          <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">ACTOR ROLE</p>
                          <p className="mt-1 ds-text-xs-plus font-semibold text-slate-800">{log.actorRole}</p>
                        </div>
                      </div>
                    </SelectableRowCard>
                  );
                })
              )}
            </div>
          </AdminWorkbenchSection>
          </>
        }
        secondary={
          <AdminWorkbenchSection
            kicker="LOG DETAIL"
            title={selectedLog ? actionLabel(selectedLog.action) : "ログ詳細"}
            description={selectedLog ? `${targetTypeLabel(selectedLog.targetType)} / ${selectedLog.targetId ?? "-"}` : "一覧からログを選択してください。"}
            className="self-start xl:sticky xl:top-5"
          >
            {!selectedLog ? (
              <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">一覧からログを選択してください。</p>
            ) : (
              <div className="space-y-4">
                <DetailMetadataGrid
                  columnsClassName="md:grid-cols-2"
                  items={[
                    { label: "日時", value: selectedLog.createdAt },
                    { label: "実行ロール", value: selectedLog.actorRole },
                    { label: "対象種別", value: targetTypeLabel(selectedLog.targetType) },
                    { label: "対象ID", value: selectedLog.targetId ?? "-" },
                  ]}
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900">変更前</p>
                  <pre className="mt-2 overflow-auto ds-radius-command border border-slate-200 bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100">
                    {toPrettyJson(selectedLog.beforeJson)}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">変更後</p>
                  <pre className="mt-2 overflow-auto ds-radius-command border border-slate-200 bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100">
                    {toPrettyJson(selectedLog.afterJson)}
                  </pre>
                </div>
              </div>
            )}
          </AdminWorkbenchSection>
        }
      />
    </AdminWorkbenchPage>
  );
}
