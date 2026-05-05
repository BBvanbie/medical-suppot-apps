import type { ReactNode } from "react";

import { HospitalListSummaryStrip } from "@/components/hospitals/HospitalListSummaryStrip";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { ManualRefreshButton } from "@/components/shared/ManualRefreshButton";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { formatCaseGenderLabel } from "@/lib/casePresentation";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";
import { getHospitalDepartmentPrioritySummary } from "@/lib/hospitalPriority";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type Row = {
  case_id: string;
  team_name: string | null;
  aware_date: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_gender: string | null;
  selected_departments: string[] | null;
  status: string;
  declined_at: string;
};

function getDeclinedNextActionLabel(status: string) {
  if (status === "TRANSPORT_DECLINED") return "搬送辞退確認";
  if (status === "NOT_ACCEPTABLE") return "受入不可履歴確認";
  return "状況確認";
}

function DeclinedInfoBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

async function getRows(): Promise<Row[]> {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];

  const res = await db.query<Row>(
    `
      SELECT
        r.case_id,
        et.team_name,
        c.aware_date::text AS aware_date,
        NULLIF(btrim(COALESCE(r.patient_summary->>'name', '')), '') AS patient_name,
        NULLIF(btrim(COALESCE(r.patient_summary->>'age', '')), '') AS patient_age,
        NULLIF(btrim(COALESCE(r.patient_summary->>'gender', '')), '') AS patient_gender,
        COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
        t.status,
        t.updated_at::text AS declined_at
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN emergency_teams et ON et.id = r.from_team_id
      LEFT JOIN cases c ON c.case_uid = r.case_uid
      WHERE t.hospital_id = $1
        AND r.mode = $2
        AND t.status IN ('NOT_ACCEPTABLE', 'TRANSPORT_DECLINED')
      ORDER BY t.updated_at DESC, t.id DESC
    `,
    [user.hospitalId, user.currentMode],
  );

  return res.rows;
}

export default async function HospitalDeclinedPage() {
  const [user, operator, rows] = await Promise.all([getAuthenticatedUser(), getHospitalOperator(), getRows()]);
  const priorityCount = rows.filter((row) => getHospitalDepartmentPrioritySummary(row.selected_departments)).length;
  const notAcceptableCount = rows.filter((row) => row.status === "NOT_ACCEPTABLE").length;
  const transportDeclinedCount = rows.filter((row) => row.status === "TRANSPORT_DECLINED").length;
  const leadAction = rows[0] ? getDeclinedNextActionLabel(rows[0].status) : "辞退履歴待ち";

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code} currentMode={user?.currentMode ?? "LIVE"}>
      <div className="w-full max-w-6xl min-w-0">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="portal-eyebrow portal-eyebrow--hospital">DECLINED</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">搬送辞退患者一覧</h1>
            <p className="mt-1 text-sm text-slate-500">受入不可または搬送辞退となった患者の履歴を確認します。</p>
          </div>
          <ManualRefreshButton />
        </header>

        <HospitalListSummaryStrip
          items={[
            { label: "TOTAL DECLINED", value: rows.length, hint: "現在の表示件数" },
            { label: "PRIORITY DEPTS", value: priorityCount, hint: "救命 / CCU / 脳卒中を含む辞退履歴", tone: "priority" },
            { label: "NOT ACCEPTABLE", value: notAcceptableCount, hint: "病院側で受入不可を返答", tone: "warning" },
            { label: "TRANSPORT DECLINED", value: transportDeclinedCount, hint: leadAction, tone: "action" },
          ]}
        />

        <div className="space-y-3" data-testid="hospital-declined-list">
          {rows.map((row) => {
            const prioritySummary = getHospitalDepartmentPrioritySummary(row.selected_departments);
            const nextActionLabel = getDeclinedNextActionLabel(row.status);

            return (
              <article key={`${row.case_id}-${row.declined_at}`} className="ds-table-surface rounded-2xl border border-slate-200 px-4 py-4">
                <div className="grid gap-4 xl:ds-grid-fluid-action">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-slate-900">{row.case_id}</p>
                      <RequestStatusBadge status={row.status} />
                      {prioritySummary ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 ds-text-2xs font-semibold text-emerald-700">
                          {prioritySummary}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 ds-text-2xs font-semibold text-slate-700">
                        {nextActionLabel}
                      </span>
                      <p className="text-xs font-semibold text-slate-500">{row.team_name ?? "-"}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">{formatDateTimeMdHm(row.declined_at)}</div>
                </div>
                <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 ds-grid-hospital-worklist-wide">
                  <DeclinedInfoBlock label="覚知日時" value={formatAwareDateYmd(row.aware_date ?? "") || "-"} />
                  <DeclinedInfoBlock label="氏名" value={row.patient_name ?? "-"} />
                  <DeclinedInfoBlock label="年齢 / 性別" value={`${row.patient_age ?? "-"} / ${formatCaseGenderLabel(row.patient_gender)}`} />
                  <DeclinedInfoBlock label="選定科目" value={<span className="line-clamp-2">{row.selected_departments?.join(", ") || "-"}</span>} />
                </div>
              </article>
            );
          })}
          {rows.length === 0 ? (
            <div className="ds-table-surface rounded-2xl border border-slate-200 px-4 py-8 text-sm text-slate-500">
              該当患者はありません。
            </div>
          ) : null}
        </div>
      </div>
    </HospitalPortalShell>
  );
}
