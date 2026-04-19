import Link from "next/link";
import { notFound } from "next/navigation";

import { CaseFormPage } from "@/components/cases/CaseFormPage";
import { EmsPageHeader } from "@/components/ems/EmsPageHeader";
import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { SectionPanelFrame } from "@/components/shared/SectionPanelFrame";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultCaseDivision, isCurrentCaseDivision } from "@/lib/caseDivision";
import { authorizeCaseReadAccess, isCaseReader } from "@/lib/caseAccess";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { getEmsOperator } from "@/lib/emsOperator";
import type { CaseRecord } from "@/lib/mockCases";

type CaseDetailPageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const [{ caseId }, operator, user] = await Promise.all([params, getEmsOperator(), getAuthenticatedUser()]);
  if (!isCaseReader(user)) notFound();

  await ensureCasesColumns();
  const access = await authorizeCaseReadAccess(user, caseId);
  if (!access.ok) notFound();

  const dbRes = await db.query<{
    case_id: string;
    case_uid: string;
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
      case_id, case_uid, division, aware_date, aware_time, patient_name, age, address,
      symptom, destination, note, case_payload, team_id
    FROM cases
    WHERE case_uid = $1
    LIMIT 1
    `,
    [access.context.caseUid],
  );

  const dbCase = dbRes.rows[0];
  if (dbCase) {
    const initialCase: CaseRecord = {
      caseId: dbCase.case_id,
      division: isCurrentCaseDivision(dbCase.division) ? dbCase.division : getDefaultCaseDivision(),
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
        currentMode={user.currentMode}
        readOnly={user.role === "ADMIN"}
      />
    );
  }

  return (
    <EmsPortalShell operatorName={operator.name} operatorCode={operator.code} currentMode={user.currentMode}>
      <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
        <EmsPageHeader
          eyebrow="CASE NOT FOUND"
          title={caseId}
          description="指定された事案は現在のデータに存在しないか、参照可能な状態ではありません。"
          chip="tablet landscape"
          actions={[
            { label: "事案一覧", href: "/cases/search", variant: "secondary" },
            { label: "EMSホーム", href: "/paramedics", variant: "primary" },
          ]}
        />
        <SectionPanelFrame
          kicker="LOOKUP HELP"
          title="再確認の案内"
          description="ID の入力違い、参照権限、または未移行データの可能性があります。必要なら一覧へ戻って再検索してください。"
          bodyClassName="mt-4"
        >
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/cases/search" className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200">
              一覧へ戻る
            </Link>
            <Link href="/paramedics" className="inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
              EMSホームへ
            </Link>
          </div>
        </SectionPanelFrame>
      </div>
    </EmsPortalShell>
  );
}
