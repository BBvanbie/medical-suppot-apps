export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InboxStackIcon,
} from "@heroicons/react/24/solid";

import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalDashboardData } from "@/lib/dashboardAnalytics";
import { hospitalNavItems } from "@/lib/hospitalNavItems";
import { getHospitalOperator } from "@/lib/hospitalOperator";

function CompactMetricList({
  title,
  description,
  items,
  valueSuffix = "件",
  icon,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: number; secondaryValue?: number; secondaryLabel?: string }>;
  valueSuffix?: string;
  icon: React.ReactNode;
}) {
  const max = Math.max(...items.map((item) => Math.max(item.value, item.secondaryValue ?? 0)), 1);

  return (
    <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">{title}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{description}</h2>
        </div>
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800">{item.label}</p>
                {item.secondaryValue != null ? (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {item.secondaryLabel ?? "補助"} {item.secondaryValue}
                    {valueSuffix}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-[12px] font-semibold text-slate-500">
                {item.value}
                {valueSuffix}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function HospitalsPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) {
    redirect("/");
  }

  const [operator, data] = await Promise.all([
    getHospitalOperator(),
    getHospitalDashboardData(user.hospitalId, "30d"),
  ]);

  const leadKpis = [...data.backlogKpis, ...data.timingKpis].slice(0, 6);
  const pendingPreview = data.pendingItems.slice(0, 5);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="page-frame page-frame--wide w-full min-w-0">
        <div className="page-stack gap-6">
          <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#f0fdf4_0%,#f8fafc_44%,#dcfce7_100%)] px-6 py-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] xl:px-7">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(330px,0.92fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-600">HOSPITAL RESPONSE DESK</p>
                    <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-slate-950">病院ホーム</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      backlog、応答速度、相談後受入の傾向をまとめて確認し、優先案件へすぐ移れるホームです。
                      <span className="mx-1 font-semibold text-slate-900">{data.rangeLabel}</span>
                      を基準にしています。
                    </p>
                  </div>
                  <Link
                    href="/hospitals/requests"
                    className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    要請一覧へ
                  </Link>
                </div>

                <div className="mt-6 rounded-[26px] bg-white/92 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-600">BACKLOG WATCH</p>
                      <p className="mt-1 text-base font-semibold leading-6 text-slate-950">
                        {data.backlogKpis[0]?.hint ?? "未対応 backlog を継続監視します。"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        未読、既読未返信、相談待ちを分けて見ながら、優先案件へ直接介入する前提です。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {leadKpis.map((item) => (
                    <article key={item.label} className="rounded-[24px] bg-white/88 px-4 py-4">
                      <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
                      <p className="mt-2 text-[25px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint ?? "運用状況の継続確認"}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <section className="rounded-[28px] bg-slate-950 px-5 py-5 text-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.55)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">PRIORITY CASES</p>
                      <h2 className="mt-1 text-lg font-bold tracking-tight text-white">優先確認案件</h2>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                      {pendingPreview.length}件
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {pendingPreview.length === 0 ? <p className="text-sm text-slate-300">優先案件はありません。</p> : null}
                    {pendingPreview.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white/6 px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-300">{item.meta}</p>
                          </div>
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-100">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">ROUTES</p>
                      <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">主要導線</h2>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">desktop</span>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {hospitalNavItems
                      .filter((item) => item.href !== "/hospitals")
                      .map((item) => (
                        <Link key={item.href} href={item.href} className="group rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700">
                              <item.icon className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                {item.href === "/hospitals/requests" && "受入要請の確認と既読/応答"}
                                {item.href === "/hospitals/consults" && "相談案件への返信と確認"}
                                {item.href === "/hospitals/patients" && "搬送患者の一覧確認"}
                                {item.href === "/hospitals/declined" && "辞退案件の見直し"}
                                {item.href === "/hospitals/medical-info" && "診療情報の入力と更新"}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.95fr)]">
            <CompactMetricList
              title="REQUEST MIX"
              description="科目別要請件数"
              items={data.departmentRequests.slice(0, 8)}
              icon={<InboxStackIcon className="h-5 w-5" aria-hidden />}
            />
            <CompactMetricList
              title="ACCEPTABLE MIX"
              description="科目別受入可能件数"
              items={data.departmentAcceptable.slice(0, 8)}
              icon={<ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden />}
            />
            <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">TIMING READ</p>
                  <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">応答速度の目安</h2>
                </div>
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <ClockIcon className="h-5 w-5" aria-hidden />
                </div>
              </div>
              <div className="space-y-2.5">
                {data.timingKpis.map((item) => (
                  <div key={item.label} className="rounded-[20px] bg-slate-50/90 px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{item.hint ?? "詳細は統計ページで確認"}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tracking-tight text-slate-950">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <CompactMetricList
              title="RESPONSE PRESSURE"
              description="受入可能件数が多い科目"
              items={data.departmentAcceptable.slice(0, 6)}
              icon={<BuildingOffice2Icon className="h-5 w-5" aria-hidden />}
            />
            <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">FOLLOW-UP</p>
                  <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">次に見る画面</h2>
                </div>
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />
                </div>
              </div>
              <div className="space-y-2.5">
                <Link href="/hospitals/consults" className="block rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100">
                  <p className="text-sm font-semibold text-slate-900">相談一覧</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">相談待ちや返信待ちを集中確認</p>
                </Link>
                <Link href="/hospitals/requests" className="block rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100">
                  <p className="text-sm font-semibold text-slate-900">受入要請一覧</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">未読と既読未返信の backlog を整理</p>
                </Link>
                <Link href="/hospitals/stats" className="block rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100">
                  <p className="text-sm font-semibold text-slate-900">病院統計</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">科別依頼、相談後受入、応答速度を詳細確認</p>
                </Link>
              </div>
            </section>
          </section>
        </div>
      </div>
    </HospitalPortalShell>
  );
}
