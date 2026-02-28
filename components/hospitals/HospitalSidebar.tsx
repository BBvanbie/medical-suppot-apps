"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  InformationCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

type HospitalSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  hospitalName: string;
  hospitalCode: string;
};

type HospitalNavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const navItems: HospitalNavItem[] = [
  { label: "ホーム", href: "/hospitals", icon: HomeIcon },
  { label: "受入要請一覧", href: "/hospitals/requests", icon: ClipboardDocumentListIcon },
  { label: "搬送患者一覧", href: "/hospitals/patients", icon: UsersIcon },
  { label: "診療情報", href: "/hospitals/medical-info", icon: InformationCircleIcon },
];

export function HospitalSidebar({ isOpen, onToggle, hospitalName, hospitalCode }: HospitalSidebarProps) {
  const pathname = usePathname();
  const isItemActive = (href: string) => {
    if (href === "/hospitals") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
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
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-600">HOSPITAL</p>
              <p className="text-sm font-bold tracking-tight text-slate-800">救急搬送支援システム</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className="group relative mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 text-slate-700 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.45)] transition hover:border-emerald-200 hover:text-emerald-700"
            aria-label={isOpen ? "ナビゲーションを閉じる" : "ナビゲーションを開く"}
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(5,150,105,0.16),transparent_60%)] opacity-80 transition-opacity group-hover:opacity-100" />
            {isOpen ? <ChevronLeftIcon className="relative h-4 w-4" aria-hidden /> : <ChevronRightIcon className="relative h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`group flex items-center rounded-xl py-3 transition ${
                  isItemActive(item.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
          {hospitalName}
        </p>
        <p className="mt-1 text-xs tracking-wide text-slate-400">病院ID: {hospitalCode}</p>
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
