export type StepUpMfaAction =
  | "admin.user.issueTemporaryPassword"
  | "admin.user.update"
  | "admin.device.issueRegistrationCode"
  | "admin.device.update"
  | "admin.auditLog.read"
  | "admin.securitySettings.update";

const STEP_UP_MFA_ENFORCED = false;

const STEP_UP_MFA_ACTIONS = new Set<StepUpMfaAction>([
  "admin.user.issueTemporaryPassword",
  "admin.user.update",
  "admin.device.issueRegistrationCode",
  "admin.device.update",
  "admin.auditLog.read",
  "admin.securitySettings.update",
]);

export function isStepUpMfaAction(action: string): action is StepUpMfaAction {
  return STEP_UP_MFA_ACTIONS.has(action as StepUpMfaAction);
}

export function isStepUpMfaEnforced() {
  return STEP_UP_MFA_ENFORCED;
}

export function shouldRequireStepUpMfa(action: string) {
  return STEP_UP_MFA_ENFORCED && isStepUpMfaAction(action);
}
