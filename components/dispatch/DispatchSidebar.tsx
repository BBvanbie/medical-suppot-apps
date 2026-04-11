"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRightOnRectangleIcon, Bars3Icon } from "@heroicons/react/24/solid";

import { dispatchNavItems } from "@/lib/dispatchNavItems";
import { secureSignOut } from "@/lib/secureSignOut";

type DispatchSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  operatorName: string;
  operatorCode: string;
};

export function DispatchSidebar({ isOpen, onToggle, operatorName, operatorCode }: DispatchSidebarProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const expanded = useMemo(() => isOpen || hovered, [hovered, isOpen]);

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex h-full flex-col border-r border-amber-100/80 bg-amber-50/60 shadow-[8px_0_30px_-24px_rgba(15,23,42,0.18)] transition-[width] duration-300 ease-out ${
        expanded ? "w-72" : "w-[72px]"
      }`}
    >
      <div className="border-b border-amber-100/70 px-3 py-3">
        <div className="relative h-10">
          <div
            className={`absolute inset-y-0 left-0 min-w-0 overflow-hidden pr-12 transition-all duration-300 ease-out ${
              expanded ? "max-w-52 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"
            }`}
            aria-hidden={!expanded}
          >
            <div className="flex h-full items-center whitespace-nowrap">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-600">DISPATCH DESK</p>
                <p className="text-sm font-bold text-slate-900">指令ポータル</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`ds-button ds-button--secondary absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl px-0 text-slate-700 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)] transition-[left,right,transform,border-color,color,background-color] duration-300 ease-out hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 ${
              expanded ? "right-0 left-auto translate-x-0" : "left-1/2 right-auto -translate-x-1/2"
            }`}
            aria-label="toggle dispatch sidebar"
          >
            <Bars3Icon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3">
        <ul className="space-y-1.5">
          {dispatchNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative mx-2 flex h-10 items-center rounded-xl transition ${
                    isActive
                      ? "bg-amber-100/90 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <span className="absolute left-[8px] top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center">
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  </span>
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

      <div className="border-t border-amber-100/70 px-4 py-4">
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            expanded ? "max-h-24 translate-x-0 opacity-100" : "max-h-0 -translate-x-2 opacity-0"
          }`}
          aria-hidden={!expanded}
        >
          <div className="rounded-[20px] bg-white/90 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14)]">
            <p className="text-sm font-semibold text-slate-800">{operatorName}</p>
            <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {operatorCode}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => secureSignOut({ callbackUrl: "/login" })}
          className={`ds-button ds-button--secondary mt-3 inline-flex h-10 items-center justify-center gap-1 rounded-2xl bg-white/80 text-xs text-slate-700 hover:border-amber-200 hover:bg-amber-50/60 hover:text-amber-700 ${
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
