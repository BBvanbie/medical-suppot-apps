"use client";

import { useEffect, useState } from "react";

import { attachOfflineStatusListeners } from "@/lib/offline/offlineStatus";
import { autoSyncOfflineItems } from "@/lib/offline/offlineSync";
import { getOfflineSnapshot, refreshOfflineQueueCount, subscribeOfflineSnapshot } from "@/lib/offline/offlineStore";
import type { OfflineSnapshot } from "@/lib/offline/offlineTypes";

import { OfflineStateContext } from "@/components/offline/useOfflineState";

type OfflineProviderProps = {
  children: React.ReactNode;
};

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot>(getOfflineSnapshot());

  useEffect(() => {
    const detach = attachOfflineStatusListeners();
    const unsubscribe = subscribeOfflineSnapshot(setSnapshot);
    void refreshOfflineQueueCount();
    return () => {
      unsubscribe();
      detach();
    };
  }, []);

  useEffect(() => {
    if (snapshot.mode !== "reconnected" && snapshot.mode !== "online") return;
    void autoSyncOfflineItems().then(() => refreshOfflineQueueCount());
  }, [snapshot.mode]);

  return <OfflineStateContext value={snapshot}>{children}</OfflineStateContext>;
}
