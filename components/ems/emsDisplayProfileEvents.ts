"use client";

import type { EmsDisplaySettings } from "@/lib/emsSettingsValidation";

export const EMS_DISPLAY_SETTINGS_EVENT = "ems-display-settings-change";

export function emitEmsDisplaySettingsChange(settings: EmsDisplaySettings) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<EmsDisplaySettings>(EMS_DISPLAY_SETTINGS_EVENT, { detail: settings }));
}
