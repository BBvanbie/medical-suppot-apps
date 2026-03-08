import Link from "next/link";
import { notFound } from "next/navigation";

import { CaseFormPage } from "@/components/cases/CaseFormPage";
import { getAuthenticatedUser } from "@/lib/authContext";
import { canReadCaseTeam, isCaseReader } from "@/lib/caseAccess";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { getEmsOperator } from "@/lib/emsOperator";
import { getCaseById } from "@/lib/mockCases";
import type { CaseRecord } from "@/lib/mockCases";

type CaseDetailPageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const [operator, user] = await Promise.all([getEmsOperator(), getAuthenticatedUser()]);
  if (!isCaseReader(user)) notFound();

  await ensureCasesColumns();

  const dbRes = await db.query<{
    case_id: string;
    division: string;
    aware_date: string;
    aware_time: string;
    patient_name: string;
    age: number;
    address: string;
    symptom: string | null;
    destination: string | null;
    note: string | null;
    case_payload: unknown;
    team_id: number | null;
  }>(
    `
    SELECT
      case_id, division, aware_date, aware_time, patient_name, age, address,
      symptom, destination, note, case_payload, team_id
    FROM cases
    WHERE case_id = $1
    LIMIT 1
    `,
    [caseId],
  );

  const dbCase = dbRes.rows[0];
  if (dbCase) {
    if (!canReadCaseTeam(user, dbCase.team_id)) notFound();
    const initialCase: CaseRecord = {
      caseId: dbCase.case_id,
      division: (dbCase.division as CaseRecord["division"]) ?? "1部",
      awareDate: dbCase.aware_date ?? "",
      awareTime: dbCase.aware_time ?? "",
      address: dbCase.address ?? "",
      name: dbCase.patient_name ?? "",
      age: dbCase.age ?? 0,
      destination: dbCase.destination ?? undefined,
      symptom: dbCase.symptom ?? "",
      triageLevel: "mid",
      note: dbCase.note ?? "",
    };
    return (
      <CaseFormPage
        mode="edit"
        initialCase={initialCase}
        initialPayload={dbCase.case_payload ?? undefined}
        operatorName={operator.name}
        operatorCode={operator.code}
        readOnly={user.role === "ADMIN"}
      />
    );
  }

  const caseData = getCaseById(caseId);
  if (caseData) notFound();

  if (!caseData) {
    return (
      <div className="dashboard-shell min-h-screen bg-[var(--dashboard-bg)] px-4 py-6 text-slate-900 sm:px-5 lg:px-6">
        <div className="mx-auto w-full max-w-[880px] rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">CASE NOT FOUND</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{caseId}</h1>
          <p className="mt-2 text-sm text-slate-500">指定された事案は現在のデータに存在しません。</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              href="/cases/search"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              一覧へ戻る
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CaseFormPage
      mode="edit"
      initialCase={caseData}
      operatorName={operator.name}
      operatorCode={operator.code}
      readOnly={user.role === "ADMIN"}
    />
  );
}
