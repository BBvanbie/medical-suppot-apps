"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  HomeIcon,
  PlusCircleIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { NotificationBell } from "@/components/shared/NotificationBell";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  operatorName?: string;
  operatorCode?: string;
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
  { label: "病院検索", href: "/hospitals/search", menuKey: "hospital-search", icon: BuildingOffice2Icon },
  { label: "設定", href: "/settings", menuKey: "settings", icon: Cog6ToothIcon },
];

export function Sidebar({ isOpen, onToggle, operatorName, operatorCode }: SidebarProps) {
  const pathname = usePathname();
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

  const expanded = useMemo(() => isOpen || hovered, [hovered, isOpen]);
  const displayOperatorName = operatorName || fetchedOperatorName || "救急隊";
  const displayOperatorCode = operatorCode || fetchedOperatorCode || "-";

  const isItemActive = (href: string) => {
    if (href === "/paramedics") return pathname === "/paramedics";
    if (href === "/cases/new") return pathname === "/cases/new";
    if (href === "/cases") return pathname === "/cases" || pathname === "/cases/search" || /^\/cases\/(?!new$)[^/]+$/.test(pathname);
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
        className={`flex h-full flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-200 ease-out ${
          expanded ? "w-72" : "w-[68px]"
        }`}
      >
        <div className="border-b border-slate-100 px-3 py-3">
          <div className={`flex items-center ${expanded ? "justify-between" : "justify-center"}`}>
            {expanded ? (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-blue-600">EMS</p>
                <p className="text-sm font-bold text-slate-900">救急搬送支援システム</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              aria-label="toggle sidebar"
            >
              <Bars3Icon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <nav className={`flex-1 py-3 ${expanded ? "px-3" : "px-0"}`}>
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = isItemActive(item.href);
              const hasUnread = unreadMenuKeys.includes(item.menuKey);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => void markMenuRead(item.menuKey)}
                    className={`group relative flex items-center rounded-xl py-3 transition ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${expanded ? "justify-start gap-3 px-3" : "mx-auto h-10 w-10 justify-center px-0"}`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    {hasUnread ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" /> : null}
                    <span
                      className={`overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-150 ${
                        expanded ? "max-w-40 opacity-100" : "max-w-0 opacity-0"
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

        <div className="border-t border-slate-100 px-4 py-4">
          {expanded ? (
            <>
              <p className="text-sm font-semibold text-slate-800">{displayOperatorName}</p>
              <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {displayOperatorCode}</p>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`mt-3 inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 ${
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

      <NotificationBell className="fixed right-4 bottom-4 z-[70]" onUnreadMenuKeysChange={setUnreadMenuKeys} />
    </>
  );
}
