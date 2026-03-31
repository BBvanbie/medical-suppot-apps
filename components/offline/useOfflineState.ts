"use client";

import { createContext, use, useMemo } from "react";

import type { OfflineSnapshot } from "@/lib/offline/offlineTypes";

const defaultSnapshot: OfflineSnapshot = {
  mode: "online",
  pendingQueueCount: 0,
  hasReconnectNotice: false,
  lastSyncAt: null,
  consecutiveFailures: 0,
};

export const OfflineStateContext = createContext<OfflineSnapshot>(defaultSnapshot);

export function useOfflineState() {
  const snapshot = use(OfflineStateContext);
  return useMemo(
    () => ({
      ...snapshot,
      isOffline: snapshot.mode === "offline",
      isReconnected: snapshot.mode === "reconnected",
    }),
    [snapshot],
  );
}