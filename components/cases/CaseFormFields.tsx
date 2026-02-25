import type { CaseRecord } from "@/lib/mockCases";

type CaseFormFieldsProps = {
  initialCase: Partial<CaseRecord>;
  mode: "create" | "edit";
};

export function CaseFormFields({ initialCase, mode }: CaseFormFieldsProps) {
  return (
    <form className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">事案基本情報</h2>
        <div className="mt-4 grid grid-cols-12 gap-4">
          <label className="col-span-3 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              事案ID
            </span>
            <input
              readOnly={mode === "edit"}
              defaultValue={initialCase.caseId ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              部別
            </span>
            <select
              defaultValue={initialCase.division ?? "1部"}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            >
              <option value="1部">1部</option>
              <option value="2部">2部</option>
              <option value="3部">3部</option>
            </select>
          </label>
          <label className="col-span-2 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              覚知日付 (m/d)
            </span>
            <input
              defaultValue={initialCase.awareDate ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              覚知時間 (h:mm)
            </span>
            <input
              defaultValue={initialCase.awareTime ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
          <label className="col-span-3 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              名前
            </span>
            <input
              defaultValue={initialCase.name ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              年齢
            </span>
            <input
              type="number"
              defaultValue={initialCase.age ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">搬送・症状情報</h2>
        <div className="mt-4 grid grid-cols-12 gap-4">
          <label className="col-span-6 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              住所
            </span>
            <input
              defaultValue={initialCase.address ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
          <label className="col-span-3 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              症状
            </span>
            <input
              defaultValue={initialCase.symptom ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
          <label className="col-span-3 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              トリアージ
            </span>
            <select
              defaultValue={initialCase.triageLevel ?? "mid"}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            >
              <option value="high">高</option>
              <option value="mid">中</option>
              <option value="low">低</option>
            </select>
          </label>
          <label className="col-span-6 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              搬送先
            </span>
            <input
              defaultValue={initialCase.destination ?? ""}
              placeholder="-"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
          <label className="col-span-6 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              備考
            </span>
            <textarea
              defaultValue={initialCase.note ?? ""}
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:ring-2"
            />
          </label>
        </div>
      </section>
    </form>
  );
}
