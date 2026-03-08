export function formatCaseGenderLabel(value: string | null | undefined): string {
  if (value === "male") return "男性";
  if (value === "female") return "女性";
  if (value === "unknown") return "不明";
  return value?.trim() ? value : "-";
}

export function getAdminCaseStatusTone(status: string): string {
  if (status === "搬送決定") return "bg-emerald-100 text-emerald-700";
  if (status === "選定中") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}
