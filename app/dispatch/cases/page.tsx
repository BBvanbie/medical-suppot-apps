import { redirect } from "next/navigation";

import { UserModeBadge } from "@/components/shared/UserModeBadge";
import { getAuthenticatedUser } from "@/lib/authContext";
import { listDispatchCases } from "@/lib/dispatch/dispatchRepository";
import { ensureDispatchSchema } from "@/lib/dispatch/dispatchSchema";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DispatchInfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function formatAwareDateTime(date: string, time: string) {
  return [date, time].filter(Boolean).join(" ") || "-";
}

export default async function DispatchCasesPage() {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    redirect("/");
  }

  await ensureDispatchSchema();
  const rows = await listDispatchCases(user.currentMode);

  return (
    <div className="page-frame page-frame--default page-stack page-stack--lg w-full min-w-0">
      <header className="page-hero page-hero--compact border-amber-100/80 bg-amber-50/40">
        <div className="page-hero-grid">
          <div className="page-hero-copy">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-600">DISPATCH WORKBENCH</p>
            <h1 className="page-hero-title">指令一覧</h1>
            <div className="page-hero-inline">
              <UserModeBadge mode={user.currentMode} />
              <p className="text-sm text-slate-600">DISPATCH から起票した事案を新しい順に確認できます。</p>
            </div>
          </div>
          <div className="page-hero-aside border-amber-100/80 bg-white">
            <p className="page-hero-kicker">ROSTER VIEW</p>
            <div className="page-hero-chip-row">
              <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{rows.length} 件表示</span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">作成日時順</span>
            </div>
            <p className="page-hero-note">起票日時、割当隊、住所を近接表示し、一覧を上から読むだけで最近の dispatch 動作を確認できる構成です。</p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        {rows.map((row) => (
          <article key={row.caseId} className="ds-table-surface rounded-[24px] border border-amber-100/80 px-4 py-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">
                  {row.teamName || "隊名未設定"}
                  {row.division ? <span className="ml-2 text-sm font-semibold text-amber-700">({row.division})</span> : null}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-800">
                  {formatAwareDateTime(row.dispatchDate, row.dispatchTime)}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{row.dispatchAddress || "-"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">CASE ID</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{row.caseId}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-1">
              <DispatchInfoBlock label="作成日時" value={formatDateTime(row.createdAt)} />
            </div>
          </article>
        ))}
        {rows.length === 0 ? (
          <div className="ds-table-surface rounded-[24px] border border-amber-100/80 px-4 py-8 text-center text-sm text-slate-500">
            指令起票履歴はまだありません。
          </div>
        ) : null}
      </section>
    </div>
  );
}
