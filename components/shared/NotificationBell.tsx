"use client";

import { BellIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type NotificationItem = {
  id: number;
  kind: string;
  caseId: string | null;
  targetId: number | null;
  title: string;
  body: string;
  menuKey: string | null;
  tabKey: string | null;
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
    case "transport_decided":
      return { title: "搬送決定通知", body: `${caseLabel} が搬送決定になりました。` };
    case "transport_declined":
      return { title: "搬送辞退通知", body: `${caseLabel} が搬送辞退になりました。` };
    case "consult_comment_from_ems":
      return { title: "相談コメント受信", body: `${caseLabel} に救急コメントが届きました。` };
    default:
      return { title: item.title, body: item.body };
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
      setItems(nextItems);
      setUnreadCount(Number(data.unreadCount ?? 0));
      onUnreadMenuKeysChange?.(Array.isArray(data.unreadMenuKeys) ? data.unreadMenuKeys : []);

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
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } finally {
      await fetchNotifications();
    }
  };

  const onClickNotification = async (item: NotificationItem) => {
    const href = resolveNotificationHref(item, pathname);
    if (!href) return;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
    } catch {
      // noop
    } finally {
      setOpen(false);
      await fetchNotifications();
      router.push(href);
    }
  };

  return (
    <div ref={rootRef} className={className || "relative"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
        aria-label="通知"
      >
        <BellIcon className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute bottom-full right-0 z-40 mb-2 w-[360px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
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
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!href}
                  onClick={() => void onClickNotification(item)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    item.isRead ? "border-slate-200 bg-slate-50" : "border-rose-200 bg-rose-50/60"
                  } ${href ? "hover:border-blue-200 hover:bg-blue-50/40" : "cursor-default"}`}
                >
                  <p className="text-xs font-semibold text-slate-900">{localized.title}</p>
                  <p className="mt-1 text-xs text-slate-700">{localized.body}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
          {(() => {
            const localized = localizeNotification(toast);
            return (
              <>
                <p className="text-xs font-semibold text-blue-700">新着通知</p>
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
