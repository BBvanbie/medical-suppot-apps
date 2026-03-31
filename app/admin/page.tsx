export const dynamic = "force-dynamic";

import Link from "next/link";

import { AnalyticsHeader, AnalyticsSection, AlertList, DashboardKpiGrid, DistributionBars } from "@/components/analytics/AnalyticsSections";
import { getAdminDashboardData } from "@/lib/dashboardAnalytics";

const quickLinks = [
  { href: "/admin/ambulance-teams", label: "隊管理" },
  { href: "/admin/hospitals", label: "病院管理" },
  { href: "/admin/settings", label: "マスタ管理" },
  { href: "/admin/stats", label: "統計ページ" },
];

export default async function AdminPage() {
  const data = await getAdminDashboardData("30d");

  return (
    <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
      <AnalyticsHeader eyebrow="ADMIN PORTAL" title="管理ホーム" description="全体監視、異常検知、管理導線を優先した構成です。" rangeLabel={data.rangeLabel} />
      <DashboardKpiGrid items={data.kpis} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <AnalyticsSection title="システム全体アラート" description="介入判断に使う警戒情報です。">
          <AlertList items={data.alerts} />
        </AnalyticsSection>
        <AnalyticsSection title="主要導線" description="管理系画面へ直接移動できます。">
          <div className="grid gap-3 md:grid-cols-2">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl bg-slate-50/85 p-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200/80 transition hover:bg-white hover:ring-slate-300">
                {item.label}
              </Link>
            ))}
          </div>
        </AnalyticsSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsSection title="種別別全体件数" description="全体で多い種別です。">
          <DistributionBars items={data.incidentCounts.slice(0, 8)} />
        </AnalyticsSection>
        <AnalyticsSection title="病院別応答遅延" description="平均返信時間が長い病院です。">
          <DistributionBars items={data.hospitalDelay.slice(0, 8)} valueSuffix="分" />
        </AnalyticsSection>
      </div>
    </div>
  );
}
