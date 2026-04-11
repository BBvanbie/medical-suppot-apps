export const MFA_REQUIRED_ROLES = new Set(["EMS", "HOSPITAL"]);

export function isMfaRequiredForRole(role: string | null | undefined) {
  return MFA_REQUIRED_ROLES.has(String(role ?? ""));
}
