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
    message ??
    (status === "saving" ? "保存中..." : status === "saved" ? "保存しました" : status === "error" ? "保存に失敗しました" : "未保存");

  return <p className={`text-sm font-medium ${toneMap[status]}`}>{label}</p>;
}
