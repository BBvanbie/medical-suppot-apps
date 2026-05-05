import type { AppMode } from "@/lib/appMode";
import { getAppModeLabel } from "@/lib/appMode";

type UserModeBadgeProps = {
  mode: AppMode;
  compact?: boolean;
};

export function UserModeBadge({ mode, compact = false }: UserModeBadgeProps) {
  const toneClassName =
    mode === "TRAINING"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-semibold ds-track-section",
        compact ? "px-2.5 py-1 ds-text-2xs" : "px-3 py-1.5 ds-text-xs-compact",
        toneClassName,
      ].join(" ")}
    >
      {getAppModeLabel(mode)}
    </span>
  );
}
