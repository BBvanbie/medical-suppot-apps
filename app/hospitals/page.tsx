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
    description: "新規受信の要請と、対応中事案の状態を確認します。",
    Icon: ClipboardDocumentListIcon,
  },
  {
    href: "/hospitals/patients",
    label: "PATIENTS",
    title: "搬送患者一覧",
    description: "搬送決定された患者情報を時系列で確認します。",
    Icon: UsersIcon,
  },
  {
    href: "/hospitals/medical-info",
    label: "MEDICAL INFO",
    title: "診療情報",
    description: "院内の診療科情報や運用情報を確認します。",
    Icon: InformationCircleIcon,
  },
  {
    href: "/hospitals/search",
    label: "SEARCH",
    title: "病院検索",
    description: "過去検索や条件検索から受入候補を確認します。",
    Icon: MagnifyingGlassIcon,
  },
] as const;

export default async function HospitalsPage() {
  const operator = await getHospitalOperator();

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">HOSPITAL PORTAL</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">病院ホーム</h1>
          <p className="mt-1 text-sm text-slate-500">受入要請対応、搬送患者確認、診療情報の各機能へアクセスします。</p>
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
