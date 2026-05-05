"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  ChartBarIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  HomeIcon,
  SignalIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

import { secureSignOut } from "@/lib/secureSignOut";

type AdminSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  adminName: string;
  adminCode: string;
};

const navItems = [
  { label: "ホーム", href: "/admin", icon: HomeIcon },
  { label: "統計", href: "/admin/stats", icon: ChartBarIcon },
  { label: "監視", href: "/admin/monitoring", icon: SignalIcon },
  { label: "設定", href: "/admin/settings", icon: Cog6ToothIcon },
  { label: "ユーザー管理", href: "/admin/users", icon: UserGroupIcon },
  { label: "端末管理", href: "/admin/devices", icon: ComputerDesktopIcon },
  { label: "組織管理", href: "/admin/orgs", icon: Squares2X2Icon },
  { label: "病院管理", href: "/admin/hospitals", icon: BuildingOffice2Icon },
  { label: "救急隊管理", href: "/admin/ambulance-teams", icon: TruckIcon },
  { label: "事案一覧", href: "/admin/cases", icon: DocumentTextIcon },
  { label: "監査ログ", href: "/admin/logs", icon: DocumentMagnifyingGlassIcon },
] as const;

export function AdminSidebar({ isOpen, onToggle, adminName, adminCode }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const expanded = useMemo(() => isOpen || hovered, [hovered, isOpen]);

  useEffect(() => {
    const prefetchRoutes = () => {
      for (const item of navItems) {
        router.prefetch(item.href);
      }
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

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex h-full flex-col border-r border-orange-100/80 ds-bg-gradient-admin-sidebar ds-shadow-side-soft ds-transition-width duration-300 ease-out ${
        expanded ? "w-72" : "ds-w-sidebar-admin-collapsed"
      }`}
    >
      <div className="border-b border-orange-100/70 px-3 py-3">
        <div className="relative h-10">
          <div
            className={`absolute inset-y-0 left-0 min-w-0 overflow-hidden pr-12 ds-transition-reveal-x duration-300 ease-out ${
              expanded ? "max-w-52 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"
            }`}
            aria-hidden={!expanded}
          >
            <div className="flex h-full items-center whitespace-nowrap">
              <div>
                <p className="ds-text-xs-compact font-semibold ds-track-eyebrow text-orange-600">ADMIN</p>
                <p className="text-sm font-bold text-slate-900">管理ポータル</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 ds-transition-sidebar-toggle duration-300 ease-out hover:border-orange-200 hover:bg-orange-50/70 hover:text-orange-700 ${
              expanded ? "right-0 left-auto translate-x-0" : "left-1/2 right-auto -translate-x-1/2"
            }`}
            aria-label="toggle admin sidebar"
          >
            <Bars3Icon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-0 py-3">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative mx-2 flex h-10 items-center rounded-xl transition ${
                    isActive
                      ? "bg-orange-100/90 text-orange-700 ds-shadow-inset-orange"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <span className="absolute ds-left-compact top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center">
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  </span>
                  <span
                    className={`overflow-hidden whitespace-nowrap ds-pl-sidebar-admin pr-3 text-sm font-semibold ds-transition-reveal-x duration-300 ease-out ${
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

      <div className="border-t border-orange-100/70 px-4 py-4">
        <div
          className={`overflow-hidden ds-transition-expand duration-300 ease-out ${
            expanded ? "max-h-24 translate-x-0 opacity-100" : "max-h-0 -translate-x-2 opacity-0"
          }`}
          aria-hidden={!expanded}
        >
          <div className="rounded-2xl bg-white/90 p-3 ds-pl-sidebar-card ds-shadow-inset-orange-soft">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-orange-600" aria-hidden />
              <p className="text-sm font-semibold text-slate-800">{adminName}</p>
            </div>
            <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {adminCode}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => secureSignOut({ callbackUrl: "/login" })}
          className={`mt-3 inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white/80 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/60 hover:text-orange-700 ${
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
