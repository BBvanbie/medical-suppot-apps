import Link from "next/link";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getHospitalOperator } from "@/lib/hospitalOperator";

export default async function HospitalsPage() {
  const operator = await getHospitalOperator();

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">HOSPITAL PORTAL</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">病院ホーム</h1>
          <p className="mt-1 text-sm text-slate-500">受入依頼と搬送患者の確認、診療情報へのアクセスを行います。</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/hospitals/requests"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-emerald-200 hover:shadow-[0_24px_44px_-28px_rgba(5,150,105,0.3)]"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-600">REQUESTS</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">受入依頼一覧</h2>
            <p className="mt-1 text-sm text-slate-500">新規依頼・対応状況を確認します。</p>
          </Link>
          <Link
            href="/hospitals/patients"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-emerald-200 hover:shadow-[0_24px_44px_-28px_rgba(5,150,105,0.3)]"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-600">PATIENTS</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">搬送患者一覧</h2>
            <p className="mt-1 text-sm text-slate-500">搬送中・受入済みの患者を一覧表示します。</p>
          </Link>
          <Link
            href="/hospitals/medical-info"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-emerald-200 hover:shadow-[0_24px_44px_-28px_rgba(5,150,105,0.3)]"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-600">MEDICAL INFO</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">診療情報</h2>
            <p className="mt-1 text-sm text-slate-500">診療科目・受入体制などの情報を管理します。</p>
          </Link>
          <Link
            href="/hospitals/search"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-emerald-200 hover:shadow-[0_24px_44px_-28px_rgba(5,150,105,0.3)]"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-600">SEARCH</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">病院検索</h2>
            <p className="mt-1 text-sm text-slate-500">既存の検索・要請送信フローを開きます。</p>
          </Link>
        </section>
      </div>
    </HospitalPortalShell>
  );
}
