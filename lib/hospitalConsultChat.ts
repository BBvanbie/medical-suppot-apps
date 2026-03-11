const CONSULTABLE_STATUSES = new Set(["READ", "NEGOTIATING"]);

export function canOpenHospitalConsultChat(status: string): boolean {
  const normalized = String(status ?? "").trim().toUpperCase();
  return CONSULTABLE_STATUSES.has(normalized);
}