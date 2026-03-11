export function formatCaseGenderLabel(value: string | null | undefined): string {
  const original = String(value ?? "").trim();
  const normalized = original.toLowerCase();

  if (!original) return "-";
  if (normalized === "male" || normalized === "man" || normalized === "m" || original === "男性") return "男性";
  if (normalized === "female" || normalized === "woman" || normalized === "f" || original === "女性") return "女性";
  if (normalized === "unknown" || normalized === "other" || original === "不明") return "不明";

  return original;
}

export function getAdminCaseStatusTone(status: string): string {
  if (status === "搬送決定") return "bg-emerald-100 text-emerald-700";
  if (status === "要相談") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}
