"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DocumentMagnifyingGlassIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

type AdminSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  adminName: string;
  adminCode: string;
};

const navItems = [
  { label: "設定", href: "/admin/settings", icon: Cog6ToothIcon },
  { label: "ユーザー管理", href: "/admin/users", icon: UserGroupIcon },
  { label: "端末管理", href: "/admin/devices", icon: ComputerDesktopIcon },
  { label: "組織管理", href: "/admin/orgs", icon: Squares2X2Icon },
  { label: "病院管理", href: "/admin/hospitals", icon: BuildingOffice2Icon },
  { label: "救急隊管理", href: "/admin/ambulance-teams", icon: TruckIcon },
  { label: "監査ログ", href: "/admin/logs", icon: DocumentMagnifyingGlassIcon },
] as const;

export function AdminSidebar({ isOpen, onToggle, adminName, adminCode }: AdminSidebarProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const expanded = useMemo(() => isOpen || hovered, [hovered, isOpen]);

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex h-full flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-out ${
        expanded ? "w-72" : "w-[68px]"
      }`}
    >
      <div className="border-b border-slate-100 px-3 py-3">
        <div className={`flex items-center ${expanded ? "justify-between" : "justify-center"}`}>
          {expanded ? (
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-amber-600">ADMIN</p>
              <p className="text-sm font-bold text-slate-900">管理者ポータル</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-amber-200 hover:text-amber-700"
            aria-label="toggle admin sidebar"
          >
            <Bars3Icon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <nav className={`flex-1 py-3 ${expanded ? "px-3" : "px-0"}`}>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex h-10 items-center rounded-xl transition ${
                    isActive ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } ${expanded ? "justify-start gap-3 px-3" : "mx-auto w-10 justify-center px-0"}`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  </span>
                  <span
                    className={`overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ease-out ${
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
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-amber-600" aria-hidden />
              <p className="text-sm font-semibold text-slate-800">{adminName}</p>
            </div>
            <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {adminCode}</p>
          </div>
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
  );
}
