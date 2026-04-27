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
      <header className="page-hero page-hero--compact border-amber-100/80 bg-amber-50/40">
        <div className="page-hero-grid">
          <div className="page-hero-copy">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-600">DISPATCH WORKBENCH</p>
            <h1 className="page-hero-title">指令起票</h1>
            <div className="page-hero-inline">
              <UserModeBadge mode={user.currentMode} />
              <p className="text-sm text-slate-600">最低限の指令情報を入力し、選択した複数の出場隊へ新規事案を自動作成します。</p>
            </div>
          </div>
          <div className="page-hero-aside border-amber-100/80 bg-white">
            <p className="page-hero-kicker">DISPATCH FLOW</p>
            <div className="page-hero-chip-row">
              <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">最小入力で起票</span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">EMS へ即時反映</span>
            </div>
            <p className="page-hero-note">出場隊、覚知日時、指令先住所の順で入力し、各隊の EMS 一覧へ同時反映する高密度な起票面です。</p>
          </div>
        </div>
      </header>

      <DispatchCaseCreateForm teamOptions={teamOptions} currentMode={user.currentMode} />
    </div>
  );
}
