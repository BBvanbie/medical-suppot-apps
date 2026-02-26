import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getHospitalOperator } from "@/lib/hospitalOperator";

export default async function HospitalMedicalInfoPage() {
  const operator = await getHospitalOperator();

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">MEDICAL INFO</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">診療情報</h1>
          <p className="mt-1 text-sm text-slate-500">ここに病院の診療科目・受入体制情報を表示します。</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <p className="text-sm text-slate-600">準備中: 次の実装で診療情報編集フォームと公開設定を追加します。</p>
        </section>
      </div>
    </HospitalPortalShell>
  );
}
