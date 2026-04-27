const CRITICAL_CARE_DEPARTMENT_KEYWORDS = ["救命", "CCU", "CCUネットワーク", "CCUネ"] as const;

function normalizeDepartmentLabel(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isCriticalCareDispatchDepartment(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = normalizeDepartmentLabel(value);
  if (!normalized) return false;

  return CRITICAL_CARE_DEPARTMENT_KEYWORDS.some((keyword) =>
    normalized.includes(normalizeDepartmentLabel(keyword)),
  );
}

export function getCriticalCareDispatchDepartments(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(isCriticalCareDispatchDepartment)));
}

export function hasCriticalCareDispatchDepartment(values: unknown): boolean {
  return getCriticalCareDispatchDepartments(values).length > 0;
}
