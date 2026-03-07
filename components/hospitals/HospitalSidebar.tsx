"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  InformationCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

import { NotificationBell } from "@/components/shared/NotificationBell";

type HospitalSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  hospitalName: string;
  hospitalCode: string;
};

type HospitalNavItem = {
  label: string;
  href: string;
  menuKey: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const navItems: HospitalNavItem[] = [
  { label: "ホーム", href: "/hospitals", menuKey: "hospital-home", icon: HomeIcon },
  { label: "受入要請一覧", href: "/hospitals/requests", menuKey: "hospitals-requests", icon: ClipboardDocumentListIcon },
  { label: "搬送患者一覧", href: "/hospitals/patients", menuKey: "hospitals-patients", icon: UsersIcon },
  { label: "相談事案一覧", href: "/hospitals/consults", menuKey: "hospitals-consults", icon: InformationCircleIcon },
  { label: "搬送辞退患者一覧", href: "/hospitals/declined", menuKey: "hospitals-declined", icon: ExclamationTriangleIcon },
  { label: "診療情報入力", href: "/hospitals/medical-info", menuKey: "hospitals-medical-info", icon: InformationCircleIcon },
  { label: "設定", href: "/hp/settings", menuKey: "settings", icon: Cog6ToothIcon },
];

export function HospitalSidebar({ isOpen, onToggle, hospitalName, hospitalCode }: HospitalSidebarProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [unreadMenuKeys, setUnreadMenuKeys] = useState<string[]>([]);
  const expanded = useMemo(() => isOpen || hovered, [hovered, isOpen]);

  const isItemActive = (href: string) => {
    if (href === "/hospitals") return pathname === href;
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
                <p className="text-[11px] font-semibold tracking-[0.16em] text-emerald-600">HOSPITAL</p>
                <p className="text-sm font-bold text-slate-900">救急搬送支援システム</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
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
                    className={`relative group flex items-center rounded-xl py-3 transition ${
                      isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
              <p className="text-sm font-semibold text-slate-800">{hospitalName}</p>
              <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {hospitalCode}</p>
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
