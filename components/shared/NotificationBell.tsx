"use client";

import { BellIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

type NotificationSeverity = "info" | "warning" | "critical";

type NotificationItem = {
  id: number;
  kind: string;
  caseId: string | null;
  caseUid: string | null;
  targetId: number | null;
  title: string;
  body: string;
  menuKey: string | null;
  tabKey: string | null;
  severity: NotificationSeverity;
  dedupeKey: string | null;
  expiresAt: string | null;
  ackedAt: string | null;
  createdAt: string;
  isRead: boolean;
};

type NotificationApiResponse = {
  items: NotificationItem[];
  unreadCount: number;
  unreadMenuKeys: string[];
  unreadTabKeys: string[];
};

type NotificationBellProps = {
  className?: string;
  onUnreadMenuKeysChange?: (keys: string[]) => void;
  pollMs?: number;
};

const MENU_HREF_MAP: Record<string, string> = {
  "ems-home": "/paramedics",
  "cases-create": "/cases/new",
  "cases-list": "/cases",
  "hospital-search": "/hospitals/search",
  "hospital-home": "/hospitals",
  "hospitals-requests": "/hospitals/requests",
  "hospitals-patients": "/hospitals/patients",
  "hospitals-consults": "/hospitals/consults",
  "hospitals-declined": "/hospitals/declined",
  "hospitals-medical-info": "/hospitals/medical-info",
};

function resolveNotificationHref(item: NotificationItem, pathname: string): string | null {
  if (item.menuKey === "settings") {
    return pathname.startsWith("/hospitals") || pathname.startsWith("/hp/settings") ? "/hp/settings" : "/settings";
  }
  if (item.menuKey && MENU_HREF_MAP[item.menuKey]) return MENU_HREF_MAP[item.menuKey];
  if (item.caseId) return `/cases/${encodeURIComponent(item.caseId)}`;
  return null;
}

function localizeNotification(item: NotificationItem): { title: string; body: string } {
  const caseLabel = item.caseId ? `事案 ${item.caseId}` : "対象事案";
  switch (item.kind) {
    case "consult_status_changed":
      return { title: "要相談ステータス通知", body: `${caseLabel} が要相談になりました。` };
    case "hospital_status_changed":
      return { title: "病院ステータス更新通知", body: `${caseLabel} の病院ステータスが更新されました。` };
    case "request_received":
      return { title: "新しい受入要請", body: `${caseLabel} の受入要請が届きました。` };
    case "request_repeat":
      return { title: "未確認要請の再通知", body: `${caseLabel} の受入要請が未確認です。` };
    case "reply_delay":
      return { title: "返信遅延エスカレーション", body: `${caseLabel} の受入要請が長時間未応答です。` };
    case "selection_stalled":
      return { title: "搬送先選定の停滞", body: `${caseLabel} の搬送先選定が長時間止まっています。` };
    case "consult_stalled":
      return { title: "要相談案件の停滞", body: `${caseLabel} の要相談対応が長時間更新されていません。` };
    case "transport_decided":
      return { title: "搬送決定通知", body: `${caseLabel} が搬送決定になりました。` };
    case "transport_declined":
      return { title: "搬送辞退通知", body: `${caseLabel} が搬送辞退になりました。` };
    case "consult_comment_from_ems":
      return { title: "相談コメント受信", body: `${caseLabel} に救急コメントが届きました。` };
    case "unread_repeat":
      return { title: "未確認通知の再通知", body: `${caseLabel} の未確認通知があります。` };
    default:
      return { title: item.title, body: item.body };
  }
}

function getSeverityChipClassName(severity: NotificationSeverity) {
  switch (severity) {
    case "critical":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "warning":
      return "border-amber-200 bg-amber-100 text-amber-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getSeverityLabel(severity: NotificationSeverity) {
  switch (severity) {
    case "critical":
      return "重要";
    case "warning":
      return "要確認";
    default:
      return "通常";
  }
}

function getToastLabel(severity: NotificationSeverity) {
  switch (severity) {
    case "critical":
      return "重要通知";
    case "warning":
      return "要確認通知";
    default:
      return "新着通知";
  }
}

export function NotificationBell({ className = "", onUnreadMenuKeysChange, pollMs = 15000 }: NotificationBellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const latestSeenRef = useRef<number>(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const unreadItems = useMemo(() => items.filter((item) => !item.isRead), [items]);

  const applyNotificationState = (nextItems: NotificationItem[]) => {
    setItems(nextItems);
    const nextUnreadItems = nextItems.filter((item) => !item.isRead);
    setUnreadCount(nextUnreadItems.length);
    onUnreadMenuKeysChange?.(
      Array.from(new Set(nextUnreadItems.map((item) => item.menuKey).filter((value): value is string => Boolean(value)))),
    );
  };

  const updateNotificationItem = (itemId: number, updater: (item: NotificationItem) => NotificationItem) => {
    setItems((prevItems) => {
      const nextItems = prevItems.map((item) => (item.id === itemId ? updater(item) : item));
      const nextUnreadItems = nextItems.filter((item) => !item.isRead);
      setUnreadCount(nextUnreadItems.length);
      onUnreadMenuKeysChange?.(
        Array.from(new Set(nextUnreadItems.map((item) => item.menuKey).filter((value): value is string => Boolean(value)))),
      );
      return nextItems;
    });
  };

  const fetchNotifications = async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setIsOffline(true);
      return;
    }
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!res.ok) return;
      setIsOffline(false);
      const data = (await res.json()) as NotificationApiResponse;
      const nextItems = Array.isArray(data.items) ? data.items : [];
      applyNotificationState(nextItems);

      const latest = nextItems[0];
      if (latest && !latest.isRead && latest.id > latestSeenRef.current) {
        latestSeenRef.current = latest.id;
        setToast(latest);
      } else if (latest) {
        latestSeenRef.current = Math.max(latestSeenRef.current, latest.id);
      }
    } catch (error) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setIsOffline(true);
        return;
      }
      if (error instanceof TypeError) {
        return;
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncOnlineState = () => {
      const offline = navigator.onLine === false;
      setIsOffline(offline);
      if (!offline) void fetchNotifications();
    };
    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOffline) return;
    void fetchNotifications();
    const timer = window.setInterval(() => void fetchNotifications(), pollMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline, pollMs]);

  useEffect(() => {
    const hrefs = Array.from(
      new Set(
        items
          .map((item) => resolveNotificationHref(item, pathname))
          .filter((href): href is string => Boolean(href))
          .slice(0, 6),
      ),
    );
    for (const href of hrefs) {
      router.prefetch(href);
    }
  }, [items, pathname, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;
      if (!rootRef.current?.contains(targetNode)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  const markAllRead = async () => {
    applyNotificationState(items.map((item) => ({ ...item, isRead: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
        keepalive: true,
      });
    } catch {
      void fetchNotifications();
    }
  };

  const acknowledgeNotification = async (item: NotificationItem) => {
    const ackedAt = new Date().toISOString();
    updateNotificationItem(item.id, (current) => ({
      ...current,
      isRead: true,
      ackedAt: current.ackedAt ?? ackedAt,
    }));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id], ack: true }),
        keepalive: true,
      });
    } catch {
      void fetchNotifications();
    }
  };

  const onClickNotification = async (item: NotificationItem) => {
    const href = resolveNotificationHref(item, pathname);
    if (!href) return;

    setOpen(false);
    updateNotificationItem(item.id, (current) => ({ ...current, isRead: true }));
    startTransition(() => {
      router.push(href);
    });

    try {
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
        keepalive: true,
      });
    } catch {
      // noop
    }
  };

  return (
    <div ref={rootRef} className={className || "relative"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ds-button ds-button--secondary relative h-10 w-10 cursor-pointer rounded-xl px-0 text-slate-700 hover:border-blue-200 hover:text-blue-700"
        aria-label="通知"
      >
        <BellIcon className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 ds-text-2xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="ds-dialog-surface absolute bottom-full right-0 z-40 mb-2 ds-w-popover p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">通知</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              すべて既読
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto">
            {items.length === 0 ? <p className="text-xs text-slate-500">通知はありません。</p> : null}
            {items.map((item) => {
              const href = resolveNotificationHref(item, pathname);
              const localized = localizeNotification(item);
              const canAcknowledge = (item.severity === "warning" || item.severity === "critical") && !item.ackedAt;
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 transition ${
                    item.isRead ? "border-slate-200 bg-slate-50" : "border-rose-200 bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900">{localized.title}</p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 ds-text-2xs font-semibold ${getSeverityChipClassName(item.severity)}`}>
                          {getSeverityLabel(item.severity)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700">{localized.body}</p>
                      <p className="mt-1 ds-text-2xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    {canAcknowledge ? (
                      <button
                        type="button"
                        onClick={() => void acknowledgeNotification(item)}
                        className="shrink-0 rounded-md border border-amber-200 bg-white px-2 py-1 ds-text-2xs font-semibold text-amber-800 hover:bg-amber-50"
                      >
                        確認
                      </button>
                    ) : item.ackedAt ? (
                      <span className="shrink-0 rounded-md bg-slate-200 px-2 py-1 ds-text-2xs font-semibold text-slate-700">確認済み</span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!href}
                      onClick={() => void onClickNotification(item)}
                      className={`rounded-md px-2 py-1 ds-text-2xs font-semibold ${
                        href ? "text-blue-700 hover:bg-blue-50" : "text-slate-400"
                      }`}
                    >
                      開く
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="ds-dialog-surface fixed bottom-4 right-4 z-50 ds-w-toast p-3">
          {(() => {
            const localized = localizeNotification(toast);
            return (
              <>
                <p className="text-xs font-semibold text-blue-700">{getToastLabel(toast.severity)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{localized.title}</p>
                <p className="mt-1 text-xs text-slate-700">{localized.body}</p>
              </>
            );
          })()}
        </div>
      ) : null}

      {unreadItems.length > 0 ? <span className="sr-only">{unreadItems.length} unread notifications</span> : null}
    </div>
  );
}
