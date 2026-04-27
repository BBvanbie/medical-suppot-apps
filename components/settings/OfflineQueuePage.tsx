"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { deleteOfflineRecord, OFFLINE_DB_STORES } from "@/lib/offline/offlineDb";
import { getOfflineCaseDraft } from "@/lib/offline/offlineCaseDrafts";
import { buildOfflineConflictGroupDiffs, classifyOfflineConflict } from "@/lib/offline/offlineConflict";
import { canRetryOfflineQueueItem, getOfflineFailureLabel, getOfflineRecoveryActionLabel } from "@/lib/offline/offlineQueueRecovery";
import { deleteOfflineCaseDraft } from "@/lib/offline/offlineCaseDrafts";
import { listOfflineQueueItems, resendOfflineQueueItem, retryOfflineQueueItems } from "@/lib/offline/offlineSync";
import { refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineConflictGroupDiff, OfflineConflictSummary, OfflineFieldGroup, OfflineQueueItem } from "@/lib/offline/offlineTypes";

function formatQueueType(type: OfflineQueueItem["type"]) {
  switch (type) {
    case "case_update":
      return "事案更新";
    case "hospital_request_send":
      return "受入要請送信";
    case "consult_reply":
      return "相談返信";
    case "settings_sync":
      return "設定同期";
    default:
      return type;
  }
}

function formatQueueStatus(status: OfflineQueueItem["status"]) {
  switch (status) {
    case "pending":
      return "保留中";
    case "ready_to_send":
      return "送信待ち";
    case "sending":
      return "送信中";
    case "conflict":
      return "競合あり";
    case "failed":
      return "送信失敗";
    default:
      return status;
  }
}

function getStatusTone(item: OfflineQueueItem) {
  if (item.status === "conflict") return "ds-status-badge ds-status-badge--warning";
  if (item.status === "failed") return "ds-status-badge ds-status-badge--danger";
  if (item.status === "sending") return "ds-status-badge ds-status-badge--info";
  return "ds-status-badge ds-status-badge--neutral";
}

function getConflictTypeLabel(type?: OfflineConflictSummary["type"] | null) {
  switch (type) {
    case "local_only_changed":
      return "localのみ変更";
    case "server_only_changed":
      return "serverのみ変更";
    case "both_changed_same_field":
      return "同一項目で競合";
    case "both_changed_different_fields":
      return "別項目で競合";
    default:
      return "要確認";
  }
}

function getFieldGroupLabel(group: OfflineFieldGroup) {
  switch (group) {
    case "basic":
      return "基本情報";
    case "summary":
      return "概要";
    case "findingsV2":
      return "所見";
    case "sendHistory":
      return "送信履歴";
    default:
      return group;
  }
}

function formatDiffValue(value: string) {
  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
}

function QueueInfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-1 text-sm leading-6 text-slate-700">{value}</div>
    </div>
  );
}

export function OfflineQueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [conflictSummary, setConflictSummary] = useState<OfflineConflictSummary | null>(null);
  const [conflictDiffs, setConflictDiffs] = useState<OfflineConflictGroupDiff[]>([]);
  const [conflictServerUpdatedAt, setConflictServerUpdatedAt] = useState<string | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const retryableItems = useMemo(() => items.filter((item) => canRetryOfflineQueueItem(item) && item.status !== "sending"), [items]);
  const summary = useMemo(
    () => ({
      total: items.length,
      retryable: retryableItems.length,
      review: items.filter((item) => item.recoveryAction === "review").length,
      discardable: items.filter((item) => item.recoveryAction === "discard").length,
    }),
    [items, retryableItems],
  );

  const selectedConflictTargetHref = useMemo(() => {
    if (!selectedItem || selectedItem.type !== "case_update") return null;
    if (selectedItem.serverCaseId) return `/cases/${encodeURIComponent(selectedItem.serverCaseId)}`;
    if (selectedItem.localCaseId) return "/cases/new";
    return null;
  }, [selectedItem]);

  useEffect(() => {
    let cancelled = false;

    const loadConflictSummary = async () => {
      if (!selectedItem || selectedItem.status !== "conflict" || selectedItem.type !== "case_update" || !selectedItem.serverCaseId) {
        setConflictSummary(null);
        setConflictDiffs([]);
        setConflictServerUpdatedAt(null);
        return;
      }

      setConflictLoading(true);
      try {
        const [draft, serverResponse] = await Promise.all([
          selectedItem.localCaseId ? getOfflineCaseDraft(selectedItem.localCaseId) : Promise.resolve(null),
          fetch(`/api/cases/${encodeURIComponent(selectedItem.serverCaseId)}/offline-conflict`, { cache: "no-store" }),
        ]);
        const serverData = (await serverResponse.json().catch(() => null)) as { payload?: unknown; updatedAt?: string | null } | null;
        if (cancelled) return;

        if (!serverResponse.ok || !draft?.serverSnapshot || !draft.payload || !serverData?.payload) {
          setConflictSummary({
            type: "requires_review",
            localGroups: [],
            serverGroups: [],
            reason: "比較基準が不足しているため、内容確認のみ可能です。",
          });
          setConflictDiffs([]);
          setConflictServerUpdatedAt(serverData?.updatedAt ?? null);
          return;
        }

        setConflictSummary(classifyOfflineConflict(draft.serverSnapshot, draft.payload, serverData.payload));
        setConflictDiffs(buildOfflineConflictGroupDiffs(draft.serverSnapshot, draft.payload, serverData.payload));
        setConflictServerUpdatedAt(serverData.updatedAt ?? null);
      } catch {
        if (!cancelled) {
          setConflictSummary({
            type: "requires_review",
            localGroups: [],
            serverGroups: [],
            reason: "比較データの取得に失敗したため、内容確認のみ可能です。",
          });
          setConflictDiffs([]);
          setConflictServerUpdatedAt(null);
        }
      } finally {
        if (!cancelled) setConflictLoading(false);
      }
    };

    void loadConflictSummary();
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  const loadItems = async () => {
    const nextItems = await listOfflineQueueItems();
    nextItems.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    startTransition(() => {
      setItems(nextItems);
    });
  };

  useEffect(() => {
    let cancelled = false;
    void listOfflineQueueItems().then((nextItems) => {
      if (cancelled) return;
      nextItems.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      startTransition(() => {
        setItems(nextItems);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const discardItem = async (id: string) => {
    setMessage("");
    setErrorMessage("");
    await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, id);
    await refreshOfflineQueueCount();
    await loadItems();
    setMessage("未送信項目を破棄しました。");
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  };

  const discardConflictWithServerPriority = async (item: OfflineQueueItem) => {
    setPendingItemId(item.id);
    setMessage("");
    setErrorMessage("");

    try {
      if (item.localCaseId) {
        await deleteOfflineCaseDraft(item.localCaseId);
      }
      await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item.id);
      await refreshOfflineQueueCount();
      await loadItems();
      setMessage("ローカル競合下書きを破棄し、server 優先で整理しました。");
      if (selectedItemId === item.id) {
        setSelectedItemId(null);
      }
    } finally {
      setPendingItemId(null);
    }
  };

  const deferConflictReview = () => {
    setMessage("競合案件は Offline Queue に残したまま、あとで確認できます。retry all では自動送信されません。");
    setErrorMessage("");
  };

  const sendItem = async (item: OfflineQueueItem) => {
    setPendingItemId(item.id);
    setMessage("");
    setErrorMessage("");

    try {
      const ok = await resendOfflineQueueItem(item);
      await loadItems();
      if (ok) {
        setMessage("未送信項目を送信しました。");
        if (selectedItemId === item.id) {
          setSelectedItemId(null);
        }
      } else {
        setErrorMessage("再送に失敗しました。詳細を確認してください。");
      }
    } finally {
      setPendingItemId(null);
    }
  };

  const retryAll = async () => {
    setPendingItemId("__all__");
    setMessage("");
    setErrorMessage("");

    try {
      const result = await retryOfflineQueueItems(retryableItems);
      await loadItems();
      if (result.failedCount === 0) {
        setMessage(`再送対象 ${result.successCount} 件を処理しました。`);
      } else {
        setErrorMessage(`再送対象 ${result.successCount} 件成功 / ${result.failedCount} 件失敗です。`);
      }
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
      <section className="ds-panel-surface rounded-3xl p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">OFFLINE QUEUE</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">未送信キュー一覧</h2>
            <p className="mt-2 text-sm text-slate-500">未送信項目の理由と対応方針を確認し、必要なものだけ再送します。</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void retryAll()}
              className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} rounded-xl px-4 py-2 text-sm disabled:opacity-60`}
              disabled={isRefreshing || pendingItemId === "__all__" || retryableItems.length === 0}
            >
              {pendingItemId === "__all__" ? "一括再送中..." : "一括再送"}
            </button>
            <button
              type="button"
              onClick={() => void loadItems()}
              className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} rounded-xl px-4 py-2 text-sm disabled:opacity-60`}
              disabled={isRefreshing}
            >
              {isRefreshing ? "更新中..." : "更新"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "総件数", value: `${summary.total}件`, tone: "text-slate-900" },
            { label: "再送可能", value: `${summary.retryable}件`, tone: "text-blue-700" },
            { label: "内容確認", value: `${summary.review}件`, tone: "text-amber-700" },
            { label: "破棄候補", value: `${summary.discardable}件`, tone: "text-rose-700" },
          ].map((item) => (
            <div key={item.label} className="ds-muted-panel rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className={["mt-2 text-lg font-bold", item.tone].join(" ")}>{item.value}</p>
            </div>
          ))}
        </div>

        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
        {errorMessage ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p> : null}

        <div className="mt-6 space-y-3" data-testid="offline-queue-table">
          {items.map((item) => {
            const selected = selectedItemId === item.id;
            return (
              <article
                key={item.id}
                className={`ds-table-surface cursor-pointer rounded-2xl border px-4 py-4 transition ${
                  selected
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-slate-200 hover:border-blue-200 hover:bg-blue-50/20"
                }`}
                data-testid="offline-queue-row"
                data-queue-id={item.id}
                onClick={() => setSelectedItemId(item.id)}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-slate-900">{formatQueueType(item.type)}</p>
                      <span className={getStatusTone(item)}>{formatQueueStatus(item.status)}</span>
                      <p className="text-xs font-semibold text-slate-500">
                        {item.serverCaseId ?? item.localCaseId ?? item.targetId ?? "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start justify-end">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      selected ? "border-blue-200 bg-blue-100 text-blue-700" : "border-slate-200 bg-white text-slate-600"
                    }`}>
                      {selected ? "選択中" : "タップして詳細"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <QueueInfoBlock label="原因" value={getOfflineFailureLabel(item.failureKind)} />
                  <QueueInfoBlock label="推奨対応" value={getOfflineRecoveryActionLabel(item.recoveryAction)} />
                  <QueueInfoBlock label="最終試行" value={item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString() : "-"} />
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    disabled={!canRetryOfflineQueueItem(item) || pendingItemId === item.id || pendingItemId === "__all__"}
                    onClick={() => void sendItem(item)}
                    className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
                  >
                    {pendingItemId === item.id ? "送信中..." : item.status === "failed" ? "再試行" : "送信"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void discardItem(item.id)}
                    className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.danger} rounded-lg px-3 py-1.5 text-xs`}
                  >
                    破棄
                  </button>
                </div>
              </article>
            );
          })}
          {items.length === 0 ? (
            <div className="ds-table-surface rounded-2xl border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              未送信キューはありません。
            </div>
          ) : null}
        </div>
      </section>

      <aside className="ds-panel-surface rounded-3xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">DETAIL</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">キュー詳細</h2>
        {selectedItem ? (
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            {selectedItem.status === "conflict" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">CONFLICT</p>
                <h3 className="mt-2 text-sm font-bold text-amber-950">サーバー更新とローカル下書きが競合しています</h3>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  自動マージは行わず、server 優先で同期を止めています。内容を確認して事案画面で再保存するか、不要ならローカル下書きを破棄してください。
                </p>
                <div className="ds-panel-surface mt-3 space-y-2 rounded-xl border-amber-200/80 px-3 py-3 text-xs leading-5 text-amber-900 shadow-none">
                  <p>推奨操作: 1. 事案へ戻る 2. 内容確認 3. 再保存</p>
                  <p>server 優先: ローカル内容が不要なら競合項目と下書きを破棄して整理します。</p>
                </div>
                {conflictLoading ? <p className="mt-3 text-xs text-amber-800">競合差分を確認中...</p> : null}
                {conflictSummary ? (
                  <div className="ds-panel-surface mt-3 space-y-3 rounded-xl border-amber-200/80 px-3 py-3 text-xs leading-5 text-amber-950 shadow-none" data-testid="offline-conflict-summary">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ds-status-badge ds-status-badge--warning">{getConflictTypeLabel(conflictSummary.type)}</span>
                      <span className="text-slate-500">
                        server更新: {conflictServerUpdatedAt ? new Date(conflictServerUpdatedAt).toLocaleString() : "-"}
                      </span>
                    </div>
                    <p>{conflictSummary.reason}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="font-semibold text-slate-700">local 変更項目</p>
                        <p className="mt-1 text-slate-600">
                          {conflictSummary.localGroups.length > 0
                            ? conflictSummary.localGroups.map(getFieldGroupLabel).join(" / ")
                            : "変更なし"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">server 変更項目</p>
                        <p className="mt-1 text-slate-600">
                          {conflictSummary.serverGroups.length > 0
                            ? conflictSummary.serverGroups.map(getFieldGroupLabel).join(" / ")
                            : "変更なし"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {conflictDiffs.length > 0 ? (
                  <div className="mt-3 space-y-3" data-testid="offline-conflict-diff">
                    {conflictDiffs.map((group) => (
                      <div key={group.group} className="rounded-xl border border-amber-200/80 bg-white/80 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">{getFieldGroupLabel(group.group)}</p>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {group.fields.length} 差分
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {group.fields.map((field) => (
                            <div key={`${group.group}-${field.path}`} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-[11px] leading-5 text-slate-700">
                              <p className="font-semibold text-slate-900">{field.path}</p>
                              <div className="mt-2 grid gap-2 md:grid-cols-3">
                                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                                  <p className="font-semibold text-slate-500">base</p>
                                  <p className="mt-1 break-all">{formatDiffValue(field.baseValue)}</p>
                                </div>
                                <div className={`rounded-lg px-2.5 py-2 ${field.changedInLocal ? "bg-blue-50 text-blue-900" : "bg-slate-50"}`}>
                                  <p className="font-semibold text-slate-500">local</p>
                                  <p className="mt-1 break-all">{formatDiffValue(field.localValue)}</p>
                                </div>
                                <div className={`rounded-lg px-2.5 py-2 ${field.changedInServer ? "bg-emerald-50 text-emerald-900" : "bg-slate-50"}`}>
                                  <p className="font-semibold text-slate-500">server</p>
                                  <p className="mt-1 break-all">{formatDiffValue(field.serverValue)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedConflictTargetHref ? (
                    <button
                      type="button"
                      onClick={() => router.push(selectedConflictTargetHref)}
                      className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} rounded-xl px-4 py-2 text-sm`}
                    >
                      localを採用して再保存
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={deferConflictReview}
                    className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} rounded-xl px-4 py-2 text-sm`}
                  >
                    あとで確認する
                  </button>
                  <button
                    type="button"
                    onClick={() => void discardConflictWithServerPriority(selectedItem)}
                    disabled={pendingItemId === selectedItem.id || pendingItemId === "__all__"}
                    className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.danger} rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
                  >
                    {pendingItemId === selectedItem.id ? "整理中..." : "server優先で破棄"}
                  </button>
                </div>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">種別</p>
              <p className="mt-1 text-slate-900">{formatQueueType(selectedItem.type)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">対象</p>
              <p className="mt-1 text-slate-900">{selectedItem.serverCaseId ?? selectedItem.localCaseId ?? selectedItem.targetId ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">状態</p>
              <p className="mt-1 text-slate-900">{formatQueueStatus(selectedItem.status)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">原因</p>
              <p className="mt-1 text-slate-900">{getOfflineFailureLabel(selectedItem.failureKind)}</p>
              <p className="mt-1 text-slate-500">{selectedItem.errorMessage ?? "まだ失敗理由は記録されていません。"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">推奨対応</p>
              <p className="mt-1 text-slate-900">{getOfflineRecoveryActionLabel(selectedItem.recoveryAction)}</p>
            </div>
            {selectedItem.status === "conflict" ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">競合種別</p>
                <p className="mt-1 text-slate-900">{getConflictTypeLabel(conflictSummary?.type ?? selectedItem.conflictType)}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">競合理由</p>
                <p className="mt-1 text-slate-900">{selectedItem.errorMessage ?? "サーバー更新後にローカル下書きが残っているため、内容確認が必要です。"}</p>
                <p className="mt-1 text-slate-500">
                  baseServerUpdatedAt: {selectedItem.baseServerUpdatedAt ? new Date(selectedItem.baseServerUpdatedAt).toLocaleString() : "-"}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payload</p>
              <pre className="ds-muted-panel mt-2 max-h-[24rem] overflow-auto rounded-2xl p-3 text-xs text-slate-700">{JSON.stringify(selectedItem.payload, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">一覧から項目を選ぶと詳細を表示します。</p>
        )}
      </aside>
    </div>
  );
}
