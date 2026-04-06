import { redirect } from "next/navigation";

import { DispatchCaseCreateForm } from "@/components/dispatch/DispatchCaseCreateForm";
import { UserModeBadge } from "@/components/shared/UserModeBadge";
import { getAuthenticatedUser } from "@/lib/authContext";
import { listDispatchTeamOptions } from "@/lib/dispatch/dispatchRepository";
import { ensureDispatchSchema } from "@/lib/dispatch/dispatchSchema";

export default async function DispatchNewPage() {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    redirect("/");
  }

  await ensureDispatchSchema();
  const teamOptions = await listDispatchTeamOptions();

  return (
    <div className="page-frame page-frame--default page-stack page-stack--lg w-full min-w-0">
      <header className="overflow-hidden rounded-[30px] border border-amber-100/80 bg-amber-50/40 px-6 py-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.75fr)] xl:items-end">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-600">DISPATCH WORKBENCH</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">指令起票</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <UserModeBadge mode={user.currentMode} />
              <p className="text-sm leading-7 text-slate-600">最低限の指令情報を入力して A 隊向けの新規事案を自動作成します。</p>
            </div>
          </div>
          <div className="rounded-[24px] border border-amber-100/80 bg-white px-4 py-4 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">DISPATCH FLOW</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">最小入力で起票</span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">EMS へ即時反映</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">隊名、覚知日時、指令先住所の順で入力し、そのまま EMS 一覧へ流す高密度な起票面です。</p>
          </div>
        </div>
      </header>

      <DispatchCaseCreateForm teamOptions={teamOptions} currentMode={user.currentMode} />
    </div>
  );
}
