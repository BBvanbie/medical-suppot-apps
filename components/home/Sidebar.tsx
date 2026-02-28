"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowRightOnRectangleIcon,
  BuildingOffice2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  operatorName?: string;
  operatorCode?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const navItems: NavItem[] = [
  { label: "ホーム", href: "/paramedics", icon: HomeIcon },
  { label: "新規事案作成", href: "/cases/new", icon: PlusCircleIcon },
  { label: "事案検索", href: "/cases/search", icon: MagnifyingGlassIcon },
  { label: "病院検索", href: "/hospitals/search", icon: BuildingOffice2Icon },
  { label: "設定", href: "/settings", icon: Cog6ToothIcon },
];

export function Sidebar({ isOpen, onToggle, operatorName, operatorCode }: SidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`flex h-full flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-220 ease-out ${
        isOpen ? "w-72" : "w-[64px] lg:w-[72px]"
      }`}
    >
      <div className="border-b border-slate-100 px-3 py-4">
        <div className={`flex h-16 items-start ${isOpen ? "justify-between" : "justify-center"}`}>
          {isOpen ? (
            <div className="w-44 overflow-hidden transition-all duration-180 opacity-100">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">EMERGENCY</p>
              <p className="text-sm font-bold tracking-tight text-slate-800">救急搬送支援システム</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className="group relative mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 text-slate-700 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.45)] transition hover:border-blue-200 hover:text-blue-700"
            aria-label={isOpen ? "ナビゲーションを閉じる" : "ナビゲーションを開く"}
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(29,78,216,0.16),transparent_60%)] opacity-80 transition-opacity group-hover:opacity-100" />
            {isOpen ? <ChevronLeftIcon className="relative h-4 w-4" aria-hidden /> : <ChevronRightIcon className="relative h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`group flex items-center rounded-xl py-3 transition ${
                  isItemActive(item.href)
                    ? "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                } ${isOpen ? "justify-start px-3" : "justify-center px-0"}`}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                <span
                  className={`ml-3 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-180 ${
                    isOpen ? "max-w-36 translate-x-0 opacity-100" : "max-w-0 -translate-x-1 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-100 px-4 py-4">
        <p className={`text-sm font-semibold text-slate-800 transition-opacity duration-180 ${isOpen ? "opacity-100" : "opacity-0"}`}>
          {operatorName ?? "救急隊"}
        </p>
        <p className="mt-1 text-xs tracking-wide text-slate-400">隊ID: {operatorCode ?? "-"}</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`mt-3 inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 ${
            isOpen ? "w-full" : "w-9"
          }`}
          aria-label="ログアウト"
          title="ログアウト"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden />
          {isOpen ? "ログアウト" : null}
        </button>
      </div>
    </aside>
  );
}
