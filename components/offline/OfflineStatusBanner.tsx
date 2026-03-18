"use client";

import Link from "next/link";

import { clearReconnectNotice } from "@/lib/offline/offlineStore";

import { useOfflineState } from "@/components/offline/useOfflineState";

export function OfflineStatusBanner({ compact = false }: { compact?: boolean }) {
  const { mode, pendingQueueCount, hasReconnectNotice, isOffline, isDegraded } = useOfflineState();

  if (mode === "online" && !hasReconnectNotice) return null;

  const toneClassName = isOffline
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : isDegraded
      ? "border-orange-300 bg-orange-50 text-orange-900"
      : "border-sky-300 bg-sky-50 text-sky-900";

  const message = isOffline
    ? "オフライン中です。一部操作は未送信キューに保存されます。"
    : isDegraded
      ? "通信が不安定です。送信操作は未送信キューに保存される場合があります。"
      : "オンラインに復帰しました。未送信キューがあれば内容を確認してください。";

  if (compact) {
    return (
      <div className={["inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-[11px]", toneClassName].join(" ")}>
        <span className="truncate font-semibold">{message}</span>
        <span className="shrink-0 opacity-75">{"\u672a\u9001\u4fe1"}: {pendingQueueCount}{"\u4ef6"}</span>
        <Link
          href="/settings/offline-queue"
          onClick={() => clearReconnectNotice()}
          className="shrink-0 inline-flex items-center rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-[10px] font-semibold transition hover:bg-white"
        >
          {"\u78ba\u8a8d"}
        </Link>
      </div>
    );
  }

  return (
    <div className={["border-b px-4 py-3 text-sm", toneClassName].join(" ")}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{message}</p>
          <p className="mt-1 text-xs opacity-80">未送信件数: {pendingQueueCount}件</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings/offline-queue"
            onClick={() => clearReconnectNotice()}
            className="inline-flex items-center rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
          >
            未送信キューを確認
          </Link>
        </div>
      </div>
    </div>
  );
}
