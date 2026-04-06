export const APP_MODES = ["LIVE", "TRAINING"] as const;

export type AppMode = (typeof APP_MODES)[number];

export function isAppMode(value: unknown): value is AppMode {
  return typeof value === "string" && APP_MODES.includes(value as AppMode);
}

export function getAppModeLabel(mode: AppMode): string {
  return mode === "TRAINING" ? "TRAINING" : "LIVE";
}
