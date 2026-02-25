import Link from "next/link";

import { CaseFormPage } from "@/components/cases/CaseFormPage";
import { getCaseById } from "@/lib/mockCases";

type CaseDetailPageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const caseData = getCaseById(caseId);

  if (!caseData) {
    return (
      <div className="dashboard-shell min-h-screen bg-[var(--dashboard-bg)] px-8 py-6 text-slate-900">
        <div className="mx-auto w-full max-w-[880px] rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">CASE NOT FOUND</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{caseId}</h1>
          <p className="mt-2 text-sm text-slate-500">指定された事案は現在のデータに存在しません。</p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return <CaseFormPage mode="edit" initialCase={caseData} />;
}
