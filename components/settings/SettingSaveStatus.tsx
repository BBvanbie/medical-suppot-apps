type SettingSaveStatusProps = {
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
};

const toneMap: Record<SettingSaveStatusProps["status"], string> = {
  idle: "text-slate-400",
  saving: "text-amber-600",
  saved: "text-emerald-600",
  error: "text-rose-600",
};

export function SettingSaveStatus({ status, message }: SettingSaveStatusProps) {
  const label =
    message
    ?? (status === "saving"
      ? "\u4fdd\u5b58\u4e2d..."
      : status === "saved"
        ? "\u4fdd\u5b58\u3057\u307e\u3057\u305f"
        : status === "error"
          ? "\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f"
          : "\u672a\u4fdd\u5b58");

  return <p className={`text-sm font-medium ${toneMap[status]}`}>{label}</p>;
}
