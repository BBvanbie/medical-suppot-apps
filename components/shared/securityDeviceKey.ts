"use client";

import { SECURITY_DEVICE_KEY_COOKIE } from "@/lib/securityAuthShared";

const STORAGE_KEY = "security:device-key";

function createDeviceKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ensureClientDeviceKey() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const deviceKey = stored || createDeviceKey();

  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, deviceKey);
  }

  document.cookie = `${SECURITY_DEVICE_KEY_COOKIE}=${encodeURIComponent(deviceKey)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  return deviceKey;
}
