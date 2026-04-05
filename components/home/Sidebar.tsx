"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  ChartBarIcon,
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
  { label: "統計", href: "/paramedics/stats", menuKey: "ems-stats", icon: ChartBarIcon },
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
        className={`flex h-full flex-col border-r border-blue-100/80 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_18%,#eff6ff_100%)] shadow-[8px_0_30px_-24px_rgba(15,23,42,0.18)] transition-[width] duration-300 ease-out ${
          expanded ? "w-72" : "w-[72px]"
        }`}
      >
        <div className="border-b border-blue-100/70 px-3 py-3">
          <div className="relative h-10">
            <div
              className={`absolute inset-y-0 left-0 min-w-0 overflow-hidden pr-12 transition-all duration-300 ease-out ${
                expanded ? "max-w-52 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"
              }`}
              aria-hidden={!expanded}
            >
              <div className="flex h-full items-center whitespace-nowrap">
                <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-blue-600">EMS FIELD DESK</p>
                <p className="text-sm font-bold text-slate-900">救急搬送支援システム</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
            className={`ds-button ds-button--secondary absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl px-0 text-slate-700 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)] transition-[left,right,transform,color,background-color,border-color] duration-300 ease-out hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 ${
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
                        ? "bg-blue-100/90 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                    }`}
                  >
                    <span className="absolute left-[8px] top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center">
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    </span>
                    {hasUnread ? <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" /> : null}
                    <span
                      className={`overflow-hidden whitespace-nowrap pl-[56px] pr-4 text-sm font-semibold transition-all duration-300 ease-out ${
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

        <div className="border-t border-blue-100/70 px-4 py-4">
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              expanded ? "max-h-16 translate-x-0 opacity-100" : "max-h-0 -translate-x-2 opacity-0"
            }`}
            aria-hidden={!expanded}
          >
            <div className="rounded-[20px] bg-white/90 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]">
              <p className="text-sm font-semibold text-slate-800">{displayOperatorName}</p>
              <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {displayOperatorCode}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`ds-button ds-button--secondary mt-3 inline-flex h-10 items-center justify-center gap-1 rounded-2xl bg-white/80 text-xs text-slate-700 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700 ${
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
