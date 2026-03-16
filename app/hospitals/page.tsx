import Link from "next/link";
import {
  ClipboardDocumentListIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getHospitalOperator } from "@/lib/hospitalOperator";

const cards = [
  {
    href: "/hospitals/requests",
    label: "REQUESTS",
    title: "受入要請一覧",
    description: "新規の受入要請と、対応中の事案一覧を確認できます。",
    Icon: ClipboardDocumentListIcon,
  },
  {
    href: "/hospitals/patients",
    label: "PATIENTS",
    title: "搬送患者一覧",
    description: "搬送決定された患者情報を時系列で確認できます。",
    Icon: UsersIcon,
  },
  {
    href: "/hospitals/medical-info",
    label: "MEDICAL INFO",
    title: "診療情報",
    description: "診療科目や受入体制など、院内向けの情報を確認できます。",
    Icon: InformationCircleIcon,
  },
  {
    href: "/hospitals/search",
    label: "SEARCH",
    title: "病院検索",
    description: "選定条件や地域条件から受入候補を確認できます。",
    Icon: MagnifyingGlassIcon,
  },
] as const;

export default async function HospitalsPage() {
  const operator = await getHospitalOperator();

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="w-full min-w-0">
        <header className="mb-5">
          <p className="portal-eyebrow portal-eyebrow--hospital">HOSPITAL PORTAL</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">病院ホーム</h1>
          <p className="mt-1 text-sm text-slate-500">受入要請対応、搬送患者確認、院内情報の各機能へアクセスします。</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-emerald-200 hover:shadow-[0_24px_44px_-28px_rgba(5,150,105,0.3)]"
            >
              <div className="flex items-center gap-2">
                <card.Icon className="h-5 w-5 text-emerald-600" aria-hidden />
                <p className="text-xs font-semibold tracking-[0.16em] text-emerald-600">{card.label}</p>
              </div>
              <h2 className="mt-2 text-lg font-bold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{card.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </HospitalPortalShell>
  );
}
