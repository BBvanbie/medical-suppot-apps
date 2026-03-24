import { redirect } from "next/navigation";

import { DispatchCaseCreateForm } from "@/components/dispatch/DispatchCaseCreateForm";
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
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">DISPATCH PORTAL</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">指令起票</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">最低限の指令情報を入力して A 隊向けの新規事案を自動作成します。</p>
      </header>

      <DispatchCaseCreateForm teamOptions={teamOptions} />
    </div>
  );
}
