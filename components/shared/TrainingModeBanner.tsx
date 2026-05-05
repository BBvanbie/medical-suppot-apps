import type { AppMode } from "@/lib/appMode";

export function TrainingModeBanner({ mode }: { mode: AppMode }) {
  if (mode !== "TRAINING") return null;

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 ds-shadow-warning-banner">
      <p className="ds-text-xs-compact font-bold ds-track-eyebrow text-amber-700">TRAINING MODE</p>
      <p className="mt-1 font-semibold">訓練モードで表示中です。</p>
      <p className="mt-1 text-xs leading-6 text-amber-800/90">本番一覧、通知、本番集計とは分離された訓練データだけを扱います。</p>
    </div>
  );
}
