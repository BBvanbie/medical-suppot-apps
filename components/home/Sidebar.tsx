"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "ホーム",
    href: "/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-10.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "新規事案作成",
    href: "/cases/new",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "事案検索",
    href: "/cases/search",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M10.5 4a6.5 6.5 0 0 1 5.158 10.46l3.941 3.942a1 1 0 0 1-1.414 1.414l-3.942-3.941A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "病院検索",
    href: "/hospitals/search",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.8a2 2 0 0 0-.586-1.414l-4.8-4.8A2 2 0 0 0 14.2 3H5Zm8 2.2 5.8 5.8H15a2 2 0 0 1-2-2V5.2ZM11 12a1 1 0 0 1 2 0v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1v-1Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "設定",
    href: "/settings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M11 3a1 1 0 0 1 2 0v1.072a7.07 7.07 0 0 1 2.12.878l.759-.759a1 1 0 1 1 1.414 1.414l-.759.759A7.071 7.071 0 0 1 17.412 9H18.5a1 1 0 1 1 0 2h-1.088a7.07 7.07 0 0 1-.878 2.12l.759.759a1 1 0 1 1-1.414 1.414l-.759-.759A7.07 7.07 0 0 1 13 15.412V16.5a1 1 0 1 1-2 0v-1.088a7.07 7.07 0 0 1-2.12-.878l-.759.759a1 1 0 1 1-1.414-1.414l.759-.759A7.07 7.07 0 0 1 6.588 11H5.5a1 1 0 1 1 0-2h1.088a7.071 7.071 0 0 1 .878-2.12l-.759-.759A1 1 0 1 1 8.121 4.707l.759.759A7.07 7.07 0 0 1 11 4.588V3Zm1 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
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
              <p className="text-sm font-bold tracking-tight text-slate-800">搬送支援システム</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className="group relative mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 text-slate-700 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.45)] transition hover:border-blue-200 hover:text-blue-700"
            aria-label={isOpen ? "ナビゲーションを閉じる" : "ナビゲーションを開く"}
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(29,78,216,0.16),transparent_60%)] opacity-80 transition-opacity group-hover:opacity-100" />
            <svg viewBox="0 0 24 24" className="relative h-4 w-4" aria-hidden="true">
              <path
                d={isOpen ? "M14.5 7 9.5 12l5 5" : "M9.5 7 14.5 12l-5 5"}
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
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
                <span className="shrink-0">{item.icon}</span>
                <span
                  className={`ml-3 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-180 ${
                    isOpen
                      ? "max-w-36 translate-x-0 opacity-100"
                      : "max-w-0 -translate-x-1 opacity-0"
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
          城南救急隊 A-3
        </p>
        <p className="mt-1 text-xs tracking-wide text-slate-400">隊ID: EMS-AX-0421</p>
      </div>
    </aside>
  );
}
