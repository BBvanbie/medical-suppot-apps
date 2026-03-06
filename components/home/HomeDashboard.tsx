"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BuildingOffice2Icon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { Sidebar } from "./Sidebar";

type HomeCaseRow = {
  caseId: string;
  division: string;
  awareDate: string;
  awareTime: string;
  address: string;
  name: string;
  age: number;
  destination?: string | null;
};

type HomeDashboardProps = {
  rows?: HomeCaseRow[];
  operatorName: string;
  operatorCode: string;
};

const cards = [
  {
    href: "/cases/new",
    label: "NEW CASE",
    title: "新規事案作成",
    description: "新しい事案を登録します。",
    Icon: PlusCircleIcon,
  },
  {
    href: "/cases",
    label: "CASE LIST",
    title: "事案一覧",
    description: "事案行をタップして病院選定履歴を展開します。",
    Icon: RectangleStackIcon,
  },
  {
    href: "/cases/search",
    label: "CASE SEARCH",
    title: "事案検索",
    description: "条件で事案を検索します。",
    Icon: MagnifyingGlassIcon,
  },
  {
    href: "/hospitals/search",
    label: "HOSPITAL SEARCH",
    title: "病院検索",
    description: "搬送先候補を検索します。",
    Icon: BuildingOffice2Icon,
  },
  {
    href: "/settings",
    label: "SETTINGS",
    title: "設定",
    description: "システム設定を変更します。",
    Icon: Cog6ToothIcon,
  },
] as const;

export function HomeDashboard({ operatorName, operatorCode }: HomeDashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900" style={{ backgroundImage: "none" }}>
      <div className="flex h-full">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((v) => !v)}
          operatorName={operatorName}
          operatorCode={operatorCode}
        />

        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-5 lg:px-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">EMS PORTAL</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">救急隊ホーム</h1>
            <p className="mt-1 text-sm text-slate-500">よく使う機能へカードから直接移動できます。</p>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-blue-200 hover:shadow-[0_24px_44px_-28px_rgba(37,99,235,0.3)]"
              >
                <div className="flex items-center gap-2">
                  <card.Icon className="h-5 w-5 text-blue-600" aria-hidden />
                  <p className="text-xs font-semibold tracking-[0.16em] text-blue-600">{card.label}</p>
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900">{card.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{card.description}</p>
              </Link>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

