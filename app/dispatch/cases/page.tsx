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
  const rows = await listDispatchCases();

  return (
    <div className="page-frame page-frame--default page-stack page-stack--lg w-full min-w-0">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">DISPATCH PORTAL</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">指令一覧</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">DISPATCH から起票した事案を新しい順に確認できます。</p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
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
                <tr key={row.caseId} className="hover:bg-rose-50/30">
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
