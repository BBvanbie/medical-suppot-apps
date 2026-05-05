"use client";

import Link from "next/link";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { clearReconnectNotice } from "@/lib/offline/offlineStore";

import { useOfflineState } from "@/components/offline/useOfflineState";

export function OfflineStatusBanner({ compact = false }: { compact?: boolean }) {
  const { mode, pendingQueueCount, hasReconnectNotice, isOffline } = useOfflineState();
  const visibilityKey = useMemo(() => `${mode}:${hasReconnectNotice ? "notice" : "plain"}`, [hasReconnectNotice, mode]);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  if ((mode === "online" && !hasReconnectNotice) || dismissedKey === visibilityKey) return null;

  const toneClassName = isOffline ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sky-300 bg-sky-50 text-sky-900";
  const message = isOffline ? "オフライン中です。一部操作は未送信キューに保存されます。" : "オンラインに復帰しました。未送信キューがあれば内容を確認してください。";

  if (compact) {
    return (
      <div className={["inline-flex max-w-full items-center gap-1.5 rounded-xl border px-2.5 py-1.5 ds-text-2xs", toneClassName].join(" ")}>
        <span className="truncate font-semibold">{message}</span>
        <span className="shrink-0 opacity-75">{"\u672a\u9001\u4fe1"}: {pendingQueueCount}{"\u4ef6"}</span>
        <Link
          href="/settings/offline-queue"
          onClick={() => clearReconnectNotice()}
          className="shrink-0 inline-flex items-center rounded-lg border border-current/20 bg-white/70 px-2 py-0.5 ds-text-3xs font-semibold transition hover:bg-white"
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
          <button
            type="button"
            aria-label="通信状態バナーを閉じる"
            onClick={() => setDismissedKey(visibilityKey)}
            className="inline-flex h-8 w-8 items-center justify-center text-current/70 transition hover:text-current"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}