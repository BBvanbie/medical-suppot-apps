"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  HomeIcon,
  PlusCircleIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { NotificationBell } from "@/components/shared/NotificationBell";
import { getEmsOperationalModeShortLabel } from "@/lib/emsOperationalMode";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";
import { secureSignOut } from "@/lib/secureSignOut";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  operatorName?: string;
  operatorCode?: string;
  operationalMode?: EmsOperationalMode;
};

type NavItem = {
  label: string;
  href: string;
  menuKey: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type OperatorInfoResponse = {
  name?: string;
  code?: string;
};

const navItems: NavItem[] = [
  { label: "ホーム", href: "/paramedics", menuKey: "ems-home", icon: HomeIcon },
  { label: "事案作成", href: "/cases/new", menuKey: "cases-create", icon: PlusCircleIcon },
  { label: "事案一覧", href: "/cases", menuKey: "cases-list", icon: RectangleStackIcon },
  { label: "選定依頼一覧", href: "/cases/selection-requests", menuKey: "cases-selection-requests", icon: ClipboardDocumentCheckIcon },
  { label: "病院検索", href: "/hospitals/search", menuKey: "hospital-search", icon: BuildingOffice2Icon },
  { label: "統計", href: "/paramedics/stats", menuKey: "ems-stats", icon: ChartBarIcon },
  { label: "設定", href: "/settings", menuKey: "settings", icon: Cog6ToothIcon },
];

export function Sidebar({ isOpen, onToggle, operatorName, operatorCode, operationalMode = "STANDARD" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [fetchedOperatorName, setFetchedOperatorName] = useState("");
  const [fetchedOperatorCode, setFetchedOperatorCode] = useState("");
  const [unreadMenuKeys, setUnreadMenuKeys] = useState<string[]>([]);

  useEffect(() => {
    if (operatorName || operatorCode) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/ems/operator", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as OperatorInfoResponse;
        if (!active) return;
        if (data.name) setFetchedOperatorName(data.name);
        if (data.code) setFetchedOperatorCode(data.code);
      } catch {
        // noop
      }
    })();
    return () => {
      active = false;
    };
  }, [operatorCode, operatorName]);

  useEffect(() => {
    const prefetchRoutes = () => {
      for (const item of navItems) {
        router.prefetch(item.href);
      }
      router.prefetch("/cases/search");
    };

    const browserWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (browserWindow.requestIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(prefetchRoutes, { timeout: 800 });
      return () => browserWindow.cancelIdleCallback?.(idleId);
    }

    const timerId = window.setTimeout(prefetchRoutes, 180);
    return () => window.clearTimeout(timerId);
  }, [router]);

  const expanded = useMemo(() => isOpen || hovered, [hovered, isOpen]);
  const displayOperatorName = operatorName || fetchedOperatorName || "救急隊";
  const displayOperatorCode = operatorCode || fetchedOperatorCode || "-";
  const isTriage = operationalMode === "TRIAGE";

  const isItemActive = (href: string) => {
    if (href === "/paramedics") return pathname === "/paramedics";
    if (href === "/cases/new") return pathname === "/cases/new";
    if (href === "/cases") return pathname === "/cases" || pathname === "/cases/search" || /^\/cases\/(?!new$|selection-requests$)[^/]+$/.test(pathname);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const markMenuRead = async (menuKey: string) => {
    setUnreadMenuKeys((prev) => prev.filter((value) => value !== menuKey));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuKey }),
      });
    } catch {
      // noop
    }
  };

  return (
    <>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex h-full flex-col border-r ds-shadow-side-soft ds-transition-width duration-300 ease-out ${
          isTriage
            ? "border-rose-200/80 bg-white text-slate-900"
            : "border-blue-100/80 bg-white"
        } ${
          expanded ? "w-72" : "ds-w-sidebar-standard-collapsed"
        }`}
      >
        <div className={`border-b px-3 py-3 ${isTriage ? "border-rose-200/20" : "border-blue-100/70"}`}>
          <div className="relative h-10">
            <div
              className={`absolute inset-y-0 left-0 min-w-0 overflow-hidden pr-12 ds-transition-reveal-x duration-300 ease-out ${
                expanded ? "max-w-52 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"
              }`}
              aria-hidden={!expanded}
            >
              <div className="flex h-full items-center whitespace-nowrap">
                <div>
                <p className={`ds-text-2xs font-semibold ds-track-wide ${isTriage ? "text-rose-700" : "text-blue-600"}`}>
                  {isTriage ? "TRIAGE COMMAND" : "EMS FIELD DESK"}
                </p>
                <p className="text-sm font-bold text-slate-900">救急搬送支援システム</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
            className={`absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border px-0 ds-shadow-compact-soft ds-transition-sidebar-toggle-alt duration-300 ease-out ${
              isTriage
                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            } ${
              expanded ? "right-0 left-auto translate-x-0" : "left-1/2 right-auto -translate-x-1/2"
            }`}
              aria-label="toggle sidebar"
            >
              <Bars3Icon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3">
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = isItemActive(item.href);
              const hasUnread = unreadMenuKeys.includes(item.menuKey);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => void markMenuRead(item.menuKey)}
                    className={`group relative flex h-11 items-center rounded-2xl transition ${
                      isActive
                        ? isTriage
                          ? "bg-rose-50 text-rose-700 ds-shadow-inset-rose-strong"
                          : "bg-blue-100/90 text-blue-700 ds-shadow-inset-blue-soft"
                        : isTriage
                          ? "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                    }`}
                  >
                    <span className="absolute ds-left-standard top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center">
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    </span>
                    {hasUnread ? <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" /> : null}
                    <span
                      className={`overflow-hidden whitespace-nowrap ds-pl-sidebar-standard pr-4 text-sm font-semibold ds-transition-reveal-x duration-300 ease-out ${
                        expanded ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 translate-x-1 opacity-0"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={`border-t px-4 py-4 ${isTriage ? "border-rose-200/20" : "border-blue-100/70"}`}>
          <div
            className={`overflow-hidden ds-transition-expand duration-300 ease-out ${
              expanded ? "max-h-16 translate-x-0 opacity-100" : "max-h-0 -translate-x-2 opacity-0"
            }`}
            aria-hidden={!expanded}
          >
            <div
              className={`ds-radius-section px-4 py-3 ds-shadow-inset-blue-faint ${
                isTriage ? "border border-rose-100 bg-rose-50" : "bg-white/90"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{displayOperatorName}</p>
                {operationalMode === "TRIAGE" ? (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 ds-text-2xs font-semibold ds-track-section text-rose-700">
                    {getEmsOperationalModeShortLabel(operationalMode)}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 text-xs tracking-wide ${isTriage ? "text-rose-700/72" : "text-slate-400"}`}>ID: {displayOperatorCode}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => secureSignOut({ callbackUrl: "/login" })}
            className={`mt-3 inline-flex h-10 items-center justify-center gap-1 rounded-2xl border text-xs font-semibold transition ${
              isTriage
                ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                : "border-slate-200 bg-white/80 text-slate-700 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700"
            } ${
              expanded ? "w-full" : "w-9"
            }`}
            aria-label="logout"
            title="logout"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden />
            {expanded ? "ログアウト" : null}
          </button>
        </div>
      </aside>

      <NotificationBell className="fixed right-4 bottom-4 ds-z-floating" onUnreadMenuKeysChange={setUnreadMenuKeys} />
    </>
  );
}
