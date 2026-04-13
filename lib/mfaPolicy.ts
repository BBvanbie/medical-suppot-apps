// Temporary testing override as of 2026-04-13:
// HOSPITAL MFA enforcement is intentionally disabled to unblock local role-flow verification.
// To re-enable, restore HOSPITAL here, then re-register credentials for the target hospital users.
export const MFA_REQUIRED_ROLES = new Set<string>([]);

export function isMfaRequiredForRole(role: string | null | undefined) {
  return MFA_REQUIRED_ROLES.has(String(role ?? ""));
}
