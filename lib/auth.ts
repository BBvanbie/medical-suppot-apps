export const APP_ROLES = ["EMS", "HOSPITAL", "ADMIN"] as const;

export type AppRole = (typeof APP_ROLES)[number];

const roleHomeMap: Record<AppRole, string> = {
  EMS: "/paramedics",
  HOSPITAL: "/hospitals",
  ADMIN: "/admin",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function getDefaultPathForRole(role: AppRole): string {
  return roleHomeMap[role];
}

export function normalizeCallbackUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function resolvePostLoginPath(role: AppRole, callbackUrl?: string | null): string {
  return normalizeCallbackUrl(callbackUrl) ?? getDefaultPathForRole(role);
}
