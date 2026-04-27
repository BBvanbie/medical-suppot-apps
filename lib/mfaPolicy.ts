// Temporary testing override as of 2026-04-13:
// HOSPITAL MFA enforcement is intentionally disabled to unblock local role-flow verification.
// To re-enable, restore HOSPITAL here, then re-register credentials for the target hospital users.
export const MFA_REQUIRED_ROLES = new Set<string>([]);
export const MFA_TEMPORARILY_DISABLED_ROLES = new Set<string>(["HOSPITAL"]);
export const HOSPITAL_MFA_TEMPORARY_NOTE =
  "現在はローカル検証のため、HOSPITAL の WebAuthn MFA を一時停止しています。端末登録、一時パスワード、セッション失効は継続し、再開時は病院 PC で MFA を再登録します。";

export function isMfaRequiredForRole(role: string | null | undefined) {
  return MFA_REQUIRED_ROLES.has(String(role ?? ""));
}

export function isMfaTemporarilyDisabledForRole(role: string | null | undefined) {
  return MFA_TEMPORARILY_DISABLED_ROLES.has(String(role ?? ""));
}

export function getMfaStatusLabel(role: string | null | undefined, mfaRequired: boolean, mfaEnrolled: boolean) {
  if (!mfaRequired && isMfaTemporarilyDisabledForRole(role)) return "一時停止中";
  if (!mfaRequired) return "対象外";
  return mfaEnrolled ? "登録済み" : "未登録";
}
