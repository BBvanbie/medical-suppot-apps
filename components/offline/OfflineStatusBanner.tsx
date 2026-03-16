"use client";

import Link from "next/link";

import { clearReconnectNotice } from "@/lib/offline/offlineStore";

import { useOfflineState } from "@/components/offline/useOfflineState";

export function OfflineStatusBanner() {
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
