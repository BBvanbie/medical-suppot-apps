"use client";

type TraumaFindingConfig = {
  value: string;
  setValue: (value: string) => void;
  normal: boolean;
  setNormal: (value: boolean) => void;
};

export function PlusMinusToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
          value
            ? "border-emerald-700 bg-emerald-600 text-white"
            : "border-slate-300 bg-white text-slate-700"
        }`}
      >
        <span>+</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
          !value
            ? "border-rose-700 bg-rose-600 text-white"
            : "border-slate-300 bg-white text-slate-700"
        }`}
      >
        <span>-</span>
      </button>
    </div>
  );
}

export function renderTraumaFindingBody(
  middleId: string,
  traumaConfig: Record<string, TraumaFindingConfig>,
) {
  const target = traumaConfig[middleId];
  if (!target) return <p className="text-xs text-slate-500">未設定</p>;

  return (
    <div className="grid grid-cols-12 gap-3">
      <label className="col-span-9">
        <span className="mb-1 block text-xs font-semibold text-slate-500">所見</span>
        <input
          value={target.value}
          onChange={(e) => target.setValue(e.target.value)}
          disabled={target.normal}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
        />
      </label>
      <label className="col-span-3 flex items-center gap-2 pt-6 text-xs font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={target.normal}
          onChange={(e) => {
            const next = e.target.checked;
            target.setNormal(next);
            if (next) target.setValue("");
          }}
          className="h-4 w-4 rounded border-slate-300"
        />
        異常なし
      </label>
    </div>
  );
}
