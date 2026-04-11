"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRightOnRectangleIcon, Bars3Icon } from "@heroicons/react/24/solid";

import { NotificationBell } from "@/components/shared/NotificationBell";
import { hospitalNavItems } from "@/lib/hospitalNavItems";
import { secureSignOut } from "@/lib/secureSignOut";

type HospitalSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  hospitalName: string;
  hospitalCode: string;
};

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
        className={`flex h-full flex-col border-r border-emerald-100/80 bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_18%,#ecfdf5_100%)] shadow-[8px_0_30px_-24px_rgba(15,23,42,0.18)] transition-[width] duration-300 ease-out ${
          expanded ? "w-72" : "w-[68px]"
        }`}
      >
        <div className="border-b border-emerald-100/70 px-3 py-3">
          <div className="relative h-10">
            <div
              className={`absolute inset-y-0 left-0 min-w-0 overflow-hidden pr-12 transition-all duration-300 ease-out ${
                expanded ? "max-w-52 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"
              }`}
              aria-hidden={!expanded}
            >
              <div className="flex h-full items-center whitespace-nowrap">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-emerald-600">HOSPITAL</p>
                  <p className="text-sm font-bold text-slate-900">{"\u75c5\u9662\u642c\u9001\u652f\u63f4\u30b7\u30b9\u30c6\u30e0"}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
            className={`absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-[left,right,transform,border-color,color,background-color] duration-300 ease-out hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-emerald-700 ${
              expanded ? "right-0 left-auto translate-x-0" : "left-1/2 right-auto -translate-x-1/2"
            }`}
              aria-label="toggle sidebar"
            >
              <Bars3Icon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-0 py-3">
          <ul className="space-y-1.5">
            {hospitalNavItems.map((item) => {
              const isActive = isItemActive(item.href);
              const hasUnread = unreadMenuKeys.includes(item.menuKey);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => void markMenuRead(item.menuKey)}
                    className={`group relative mx-2 flex h-10 items-center rounded-xl transition ${
                      isActive
                        ? "bg-emerald-100/90 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                    }`}
                  >
                    <span className="absolute left-[6px] top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center">
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    </span>
                    {hasUnread ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" /> : null}
                    <span
                      className={`overflow-hidden whitespace-nowrap pl-[54px] pr-3 text-sm font-semibold transition-all duration-300 ease-out ${
                        expanded ? "max-w-52 translate-x-0 opacity-100" : "max-w-0 translate-x-1 opacity-0"
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

        <div className="border-t border-emerald-100/70 px-4 py-4">
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              expanded ? "max-h-16 translate-x-0 opacity-100" : "max-h-0 -translate-x-2 opacity-0"
            }`}
            aria-hidden={!expanded}
          >
            <div className="rounded-2xl bg-white/90 pb-0 pl-[42px] pr-3 pt-3 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]">
              <p className="text-sm font-semibold text-slate-800">{hospitalName}</p>
              <p className="mt-1 text-xs tracking-wide text-slate-400">ID: {hospitalCode}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => secureSignOut({ callbackUrl: "/login" })}
            className={`mt-3 inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white/80 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-700 ${
              expanded ? "w-full" : "w-9"
            }`}
            aria-label="logout"
            title="logout"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden />
            {expanded ? "\u30ed\u30b0\u30a2\u30a6\u30c8" : null}
          </button>
        </div>
      </aside>

      <NotificationBell className="fixed right-4 bottom-4 z-[70]" onUnreadMenuKeysChange={setUnreadMenuKeys} />
    </>
  );
}
