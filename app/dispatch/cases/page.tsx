import { redirect } from "next/navigation";

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

export default async function DispatchCasesPage() {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    redirect("/");
  }

  await ensureDispatchSchema();
  const rows = await listDispatchCases(user.currentMode);

  return (
    <div className="page-frame page-frame--default page-stack page-stack--lg w-full min-w-0">
      <header className="overflow-hidden rounded-[30px] border border-amber-100/80 bg-amber-50/40 px-6 py-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.75fr)] xl:items-end">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-600">DISPATCH WORKBENCH</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">指令一覧</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">DISPATCH から起票した事案を新しい順に確認できます。</p>
          </div>
          <div className="rounded-[24px] border border-amber-100/80 bg-white px-4 py-4 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">ROSTER VIEW</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{rows.length} 件表示</span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">作成日時順</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">起票日時、割当隊、住所を近接表示し、一覧を上から読むだけで最近の dispatch 動作を確認できる構成です。</p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-[28px] border border-amber-100/80 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-amber-50/40">
              <tr>
                {["事案ID", "隊名", "覚知日付", "覚知時間", "指令先住所", "作成日時"].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.caseId} className="hover:bg-amber-50/30">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">{row.caseId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.teamName || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.dispatchDate || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.dispatchTime || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.dispatchAddress || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDateTime(row.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    指令起票履歴はまだありません。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
