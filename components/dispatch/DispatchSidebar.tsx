"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import { ArrowRightOnRectangleIcon, Bars3Icon } from "@heroicons/react/24/solid";

import { dispatchNavItems } from "@/lib/dispatchNavItems";

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
      className={`flex h-full flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-out ${
        expanded ? "w-72" : "w-[68px]"
      }`}
    >
      <div className="border-b border-slate-100 px-3 py-3">
        <div className="relative h-10">
          <div
            className={`absolute inset-y-0 left-0 min-w-0 overflow-hidden pr-12 transition-all duration-300 ease-out ${
              expanded ? "max-w-52 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"
            }`}
            aria-hidden={!expanded}
          >
            <div className="flex h-full items-center whitespace-nowrap">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-rose-600">DISPATCH</p>
                <p className="text-sm font-bold text-slate-900">指令ポータル</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-[left,right,transform,border-color,color] duration-300 ease-out hover:border-rose-200 hover:text-rose-700 ${
              expanded ? "right-0 left-auto translate-x-0" : "left-1/2 right-auto -translate-x-1/2"
            }`}
            aria-label="toggle dispatch sidebar"
          >
            <Bars3Icon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-0 py-3">
        <ul className="space-y-2">
          {dispatchNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative mx-2 flex h-10 items-center rounded-xl transition ${
                    isActive ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="absolute left-[6px] top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center">
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  </span>
                  <span
                    className={`overflow-hidden whitespace-nowrap pl-[54px] pr-3 text-sm font-semibold transition-all duration-300 ease-out ${
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

      <div className="border-t border-slate-100 px-4 py-4">
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            expanded ? "max-h-24 translate-x-0 opacity-100" : "max-h-0 -translate-x-2 opacity-0"
          }`}
          aria-hidden={!expanded}
        >
          <div className="rounded-2xl bg-slate-50 p-3 pl-[42px]">
            <p className="text-sm font-semibold text-slate-800">{operatorName}</p>
            <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {operatorCode}</p>
          </div>
        </div>
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
