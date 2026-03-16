"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { deleteOfflineRecord, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import { listOfflineQueueItems } from "@/lib/offline/offlineSync";
import { refreshOfflineQueueCount } from "@/lib/offline/offlineStore";
import type { OfflineQueueItem } from "@/lib/offline/offlineTypes";

type SendHistoryItemPayload = {
  requestId: string;
  caseId: string;
  createdAt?: string;
  sentAt?: string;
  searchMode?: "or" | "and";
  selectedDepartments?: string[];
  hospitals?: Array<{
    hospitalId: number;
    hospitalName: string;
    address: string;
    phone: string;
    departments: string[];
    distanceKm: number | null;
  }>;
};

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

function canSendItem(item: OfflineQueueItem) {
  return item.type === "consult_reply" || item.type === "hospital_request_send";
}

export function OfflineQueuePage() {
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);

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
    await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, id);
    await refreshOfflineQueueCount();
    await loadItems();
    setMessage("未送信項目を破棄しました。");
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  };

  const updateQueueItem = async (item: OfflineQueueItem) => {
    await putOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item);
    await refreshOfflineQueueCount();
    await loadItems();
  };

  const sendItem = async (item: OfflineQueueItem) => {
    setPendingItemId(item.id);
    setMessage("");

    try {
      await updateQueueItem({ ...item, status: "sending", updatedAt: new Date().toISOString(), errorMessage: null });

      if (item.type === "consult_reply") {
        const targetId = Number(item.targetId);
        const note = typeof (item.payload as { note?: unknown })?.note === "string" ? (item.payload as { note: string }).note : "";
        const res = await fetch(`/api/cases/consults/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        });
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        if (!res.ok) throw new Error(data?.message ?? "相談返信の再送に失敗しました。");
      }

      if (item.type === "hospital_request_send") {
        const payload = item.payload as SendHistoryItemPayload;
        const caseId = item.serverCaseId ?? payload.caseId;
        const hospitals = Array.isArray(payload.hospitals) ? payload.hospitals : [];
        const sendHistoryItem = {
          requestId: payload.requestId,
          caseId,
          sentAt: new Date().toISOString(),
          status: "未読",
          hospitalCount: hospitals.length,
          hospitalNames: hospitals.map((hospital) => hospital.hospitalName),
          hospitals,
          searchMode: payload.searchMode,
          selectedDepartments: payload.selectedDepartments ?? [],
        };
        const res = await fetch("/api/cases/send-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, item: sendHistoryItem }),
        });
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        if (!res.ok) throw new Error(data?.message ?? "受入要請送信の再送に失敗しました。");
      }

      await deleteOfflineRecord(OFFLINE_DB_STORES.offlineQueue, item.id);
      await refreshOfflineQueueCount();
      await loadItems();
      setMessage("未送信項目を送信しました。");
      if (selectedItemId === item.id) {
        setSelectedItemId(null);
      }
    } catch (error) {
      await updateQueueItem({
        ...item,
        status: "failed",
        updatedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "送信に失敗しました。",
      });
      setMessage(error instanceof Error ? error.message : "送信に失敗しました。");
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">OFFLINE QUEUE</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">未送信キュー一覧</h2>
            <p className="mt-2 text-sm text-slate-500">送信系操作は自動送信しません。内容を確認してから手動で送信してください。</p>
          </div>
          <button
            type="button"
            onClick={() => void loadItems()}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isRefreshing}
          >
            {isRefreshing ? "更新中..." : "更新"}
          </button>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[880px] table-fixed text-sm" data-testid="offline-queue-table">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">対象事案</th>
                <th className="px-4 py-3">作成時刻</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">エラー</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100" data-testid="offline-queue-row" data-queue-id={item.id}>
                  <td className="px-4 py-3 text-slate-700">{formatQueueType(item.type)}</td>
                  <td className="px-4 py-3 text-slate-700">{item.serverCaseId ?? item.localCaseId ?? item.targetId ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={[
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      item.status === "conflict"
                        ? "bg-amber-100 text-amber-800"
                        : item.status === "failed"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700",
                    ].join(" ")}>
                      {formatQueueStatus(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.errorMessage ?? "-"}</td>
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
                        disabled={!canSendItem(item) || pendingItemId === item.id}
                        onClick={() => void sendItem(item)}
                        className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        title={canSendItem(item) ? undefined : "この種別の送信は未対応です。"}
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
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>
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
