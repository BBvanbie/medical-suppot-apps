"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { deleteOfflineRecord, OFFLINE_DB_STORES } from "@/lib/offline/offlineDb";
import { canRetryOfflineQueueItem, getOfflineFailureLabel, getOfflineRecoveryActionLabel } from "@/lib/offline/offlineQueueRecovery";
import { listOfflineQueueItems, resendOfflineQueueItem, retryOfflineQueueItems } from "@/lib/offline/offlineSync";
import { refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineQueueItem } from "@/lib/offline/offlineTypes";

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
  if (item.status === "conflict") return "bg-amber-100 text-amber-800";
  if (item.status === "failed") return "bg-rose-100 text-rose-800";
  if (item.status === "sending") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export function OfflineQueuePage() {
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
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
              className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
              disabled={isRefreshing || pendingItemId === "__all__" || retryableItems.length === 0}
            >
              {pendingItemId === "__all__" ? "一括再送中..." : "一括再送"}
            </button>
            <button
              type="button"
              onClick={() => void loadItems()}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className={["mt-2 text-lg font-bold", item.tone].join(" ")}>{item.value}</p>
            </div>
          ))}
        </div>

        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
        {errorMessage ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p> : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1120px] table-fixed text-sm" data-testid="offline-queue-table">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">対象事案</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">原因</th>
                <th className="px-4 py-3">推奨対応</th>
                <th className="px-4 py-3">最終試行</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100" data-testid="offline-queue-row" data-queue-id={item.id}>
                  <td className="px-4 py-3 text-slate-700">{formatQueueType(item.type)}</td>
                  <td className="px-4 py-3 text-slate-700">{item.serverCaseId ?? item.localCaseId ?? item.targetId ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={["inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", getStatusTone(item)].join(" ")}>
                      {formatQueueStatus(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{getOfflineFailureLabel(item.failureKind)}</td>
                  <td className="px-4 py-3 text-slate-700">{getOfflineRecoveryActionLabel(item.recoveryAction)}</td>
                  <td className="px-4 py-3 text-slate-500">{item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        詳細
                      </button>
                      <button
                        type="button"
                        disabled={!canRetryOfflineQueueItem(item) || pendingItemId === item.id || pendingItemId === "__all__"}
                        onClick={() => void sendItem(item)}
                        className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {pendingItemId === item.id ? "送信中..." : item.status === "failed" ? "再試行" : "送信"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void discardItem(item.id)}
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        破棄
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={7}>
                    未送信キューはありません。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">DETAIL</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">キュー詳細</h2>
        {selectedItem ? (
          <div className="mt-4 space-y-4 text-sm text-slate-600">
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payload</p>
              <pre className="mt-2 max-h-[24rem] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(selectedItem.payload, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">一覧から項目を選ぶと詳細を表示します。</p>
        )}
      </aside>
    </div>
  );
}