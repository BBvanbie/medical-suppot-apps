"use client";

type MedicalInfoFlipCardProps = {
  departmentName: string;
  isAvailable: boolean;
  updatedAt: string | null;
  saving?: boolean;
  disabled?: boolean;
  error?: string;
  onToggle: () => void;
};

function formatUpdatedAt(value: string | null): string {
  if (!value) return "最終更新 -";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `最終更新 ${value}`;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `最終更新 ${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function CardFace({
  departmentName,
  updatedAt,
  available,
}: {
  departmentName: string;
  updatedAt: string | null;
  available: boolean;
}) {
  return (
    <div
      className={[
        "absolute inset-0 flex h-full w-full flex-col justify-between rounded-2xl border p-5 [backface-visibility:hidden]",
        available
          ? "border-emerald-200 bg-white shadow-[0_18px_40px_-24px_rgba(21,128,61,0.25)]"
          : "rotate-y-180 border-slate-200 bg-slate-100 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.2)]",
      ].join(" ")}
      style={!available ? { transform: "rotateY(180deg)" } : undefined}
    >
      <div className="space-y-3">
        <div className={available ? "h-1.5 w-14 rounded-full bg-emerald-500" : "h-1.5 w-14 rounded-full bg-slate-400"} />
        <h3 className="text-xl font-bold tracking-tight text-slate-900">{departmentName}</h3>
      </div>
      <p className="text-sm text-slate-600">{formatUpdatedAt(updatedAt)}</p>
    </div>
  );
}

export function MedicalInfoFlipCard({
  departmentName,
  isAvailable,
  updatedAt,
  saving = false,
  disabled = false,
  error = "",
  onToggle,
}: MedicalInfoFlipCardProps) {
  return (
    <div className="group [perspective:1200px]">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || saving}
        className="relative block h-44 w-full cursor-pointer text-left disabled:cursor-not-allowed"
      >
        <div
          className="relative h-full w-full rounded-2xl transition-transform duration-300 ease-in-out [transform-style:preserve-3d] group-hover:-translate-y-0.5"
          style={{ transform: isAvailable ? "rotateY(0deg)" : "rotateY(180deg)" }}
        >
          <CardFace departmentName={departmentName} updatedAt={updatedAt} available />
          <CardFace departmentName={departmentName} updatedAt={updatedAt} available={false} />
        </div>
        {saving ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[1px]">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
          </div>
        ) : null}
      </button>
      {error ? <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
