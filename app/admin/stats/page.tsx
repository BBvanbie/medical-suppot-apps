export const dynamic = "force-dynamic";

import Link from "next/link";

import { AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { getAdminDashboardData, parseAnalyticsRange } from "@/lib/dashboardAnalytics";

const rangeItems = [
  { key: "today", label: "今日" },
  { key: "7d", label: "直近7日" },
  { key: "30d", label: "直近30日" },
  { key: "90d", label: "直近90日" },
] as const;

function DistributionBarsOrange({
  items,
  valueSuffix = "件",
  secondaryLabel,
}: {
  items: Array<{ label: string; value: number; secondaryValue?: number; secondaryLabel?: string }>;
  valueSuffix?: string;
  secondaryLabel?: string;
}) {
  const max = Math.max(...items.map((item) => Math.max(item.value, item.secondaryValue ?? 0)), 1);
  return (
    <div className="space-y-3">
      {items.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-slate-700">{item.label}</p>
            <p className="text-xs text-slate-500">
              {item.value}
              {valueSuffix}
              {item.secondaryValue != null
                ? ` / ${secondaryLabel ?? item.secondaryLabel ?? "補助"} ${item.secondaryValue}${valueSuffix}`
                : ""}
            </p>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="bg-orange-500" style={{ width: `${(item.value / max) * 100}%` }} />
            {item.secondaryValue != null ? <div className="bg-slate-300" style={{ width: `${(item.secondaryValue / max) * 100}%` }} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertListOrange({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-slate-500">アラートはありません。</p> : null}
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="rounded-2xl border border-amber-200/70 bg-amber-50/75 px-4 py-3 text-sm text-amber-900">
          {item}
        </div>
      ))}
    </div>
  );
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const range = parseAnalyticsRange(Array.isArray(params.range) ? params.range[0] : params.range);
  const incidentType = Array.isArray(params.incidentType) ? params.incidentType[0] : params.incidentType;
  const ageBucket = Array.isArray(params.ageBucket) ? params.ageBucket[0] : params.ageBucket;
  const data = await getAdminDashboardData(range, { incidentType, ageBucket });

  return (
    <div className="page-frame page-frame--wide w-full min-w-0">
      <div className="page-stack gap-5">
        <section className="overflow-hidden rounded-[30px] border border-orange-100/80 bg-white px-6 py-5 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-orange-600">ADMIN STATISTICS</p>
              <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-slate-950">全体統計</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">全体件数、滞留、応答遅延、地域や隊の偏りを俯瞰する admin 専用の統計 workbench です。</p>
            </div>
            <div className="flex flex-col items-start gap-3 xl:items-end">
              <p className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">対象: {data.rangeLabel}</p>
              <div className="flex flex-wrap gap-2">
                {rangeItems.map((item) => (
                  <Link
                    key={item.key}
                    href={`/admin/stats?range=${item.key}`}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      range === item.key
                        ? "bg-orange-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50/60 hover:text-orange-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <form method="get" action="/admin/stats" className="mt-5 grid gap-3 md:grid-cols-[160px_220px_220px_auto]">
            <input type="hidden" name="range" value={range} />
            <div className="rounded-[22px] bg-slate-50/85 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">RANGE</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-900">{data.rangeLabel}</p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-slate-500">事案種別</span>
              <select name="incidentType" defaultValue={data.activeFilters.incidentType} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300">
                {data.filterOptions.incidentTypes.map((option) => (
                  <option key={`incident-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-slate-500">年齢帯</span>
              <select name="ageBucket" defaultValue={data.activeFilters.ageBucket} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300">
                {data.filterOptions.ageBuckets.map((option) => (
                  <option key={`age-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700">
                絞り込む
              </button>
            </div>
          </form>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.kpis.map((item, index) => (
              <article key={item.label} className={`rounded-[22px] px-4 py-4 ${index === 0 ? "bg-orange-50/80" : index === 1 ? "bg-amber-50/80" : "bg-slate-50/80"}`}>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
                {item.hint ? <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <AdminWorkbenchSection kicker="WATCH" title="システム全体アラート" description="応答遅延や難渋傾向がある項目を表示します。">
            <AlertListOrange items={data.alerts} />
          </AdminWorkbenchSection>
          <AdminWorkbenchSection kicker="INCIDENT LOAD" title="種別別全体件数" description="全体で多い事案種別です。">
            <DistributionBarsOrange items={data.incidentCounts} />
          </AdminWorkbenchSection>
          <AdminWorkbenchSection kicker="TRANSPORT MIX" title="種別別 搬送 / 不搬送" description="オレンジが搬送、灰色が不搬送です。">
            <DistributionBarsOrange items={data.transportByIncident} secondaryLabel="不搬送" />
          </AdminWorkbenchSection>
          <AdminWorkbenchSection kicker="TOP TEAMS" title="出場件数上位10隊" description="件数ベースの簡易ランキングです。">
            <DistributionBarsOrange items={data.topTeams} />
          </AdminWorkbenchSection>
          <AdminWorkbenchSection kicker="REGIONAL FLOW" title="地域別平均決定時間" description="指令先住所から市区町村相当を抽出しています。">
            <DistributionBarsOrange items={data.regionalDecision} valueSuffix="分" />
          </AdminWorkbenchSection>
          <AdminWorkbenchSection kicker="AGE MIX" title="年齢別要請件数" description="年齢帯ごとの件数です。">
            <DistributionBarsOrange items={data.ageGroups} />
          </AdminWorkbenchSection>
          <AdminWorkbenchSection kicker="HOSPITAL RESPONSE" title="病院別応答遅延" description="平均返信時間が長い順に表示しています。" className="xl:col-span-2">
            <DistributionBarsOrange items={data.hospitalDelay} valueSuffix="分" />
          </AdminWorkbenchSection>
        </div>
      </div>
    </div>
  );
}
