export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";

import { AnalyticsHeader, AnalyticsSection, DashboardKpiGrid, DistributionBars, PendingList } from "@/components/analytics/AnalyticsSections";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalDashboardData } from "@/lib/dashboardAnalytics";
import { hospitalNavItems } from "@/lib/hospitalNavItems";
import { getHospitalOperator } from "@/lib/hospitalOperator";

export default async function HospitalsPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) {
    redirect("/");
  }

  const [operator, data] = await Promise.all([
    getHospitalOperator(),
    getHospitalDashboardData(user.hospitalId, "30d"),
  ]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
        <AnalyticsHeader eyebrow="HOSPITAL PORTAL" title="病院ホーム" description="滞留管理、応答速度、優先対応案件の確認を優先した構成です。" rangeLabel={data.rangeLabel} />
        <DashboardKpiGrid items={[...data.backlogKpis, ...data.timingKpis.slice(0, 3)]} />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {hospitalNavItems
            .filter((item) => item.href !== "/hospitals")
            .map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] transition hover:bg-slate-50 hover:ring-slate-300">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 transition group-hover:bg-emerald-100">
                    <item.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">MENU</p>
                    <h2 className="mt-1 text-sm font-bold leading-5 text-slate-900">{item.label}</h2>
                  </div>
                </div>
              </Link>
            ))}
        </section>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.9fr)]">
          <AnalyticsSection title="科目別要請割合" description="受信が多い科目を上位表示します。">
            <DistributionBars items={data.departmentRequests.slice(0, 8)} />
          </AnalyticsSection>
          <AnalyticsSection title="科目別受入可能件数" description="受入可能で返答した件数です。">
            <DistributionBars items={data.departmentAcceptable.slice(0, 8)} />
          </AnalyticsSection>
          <AnalyticsSection title="未対応案件" description="優先して開くべき案件です。">
            <PendingList items={data.pendingItems} />
          </AnalyticsSection>
        </div>
      </div>
    </HospitalPortalShell>
  );
}
