import {
  markOfflineRequestSuccess,
  refreshOfflineQueueCount,
  setOfflineMode,
  setOfflineSnapshot,
} from "@/lib/offline/offlineStore";

let attached = false;

function resolveOnlineMode() {
  if (typeof navigator === "undefined") return "online" as const;
  return navigator.onLine === false ? "offline" : "online";
}

export function getBrowserOfflineMode() {
  return resolveOnlineMode();
}

export function attachOfflineStatusListeners() {
  if (attached || typeof window === "undefined") return () => undefined;
  attached = true;

  const handleOnline = () => {
    setOfflineMode("reconnected");
    markOfflineRequestSuccess();
    void refreshOfflineQueueCount();
  };

  const handleOffline = () => {
    setOfflineMode("offline");
  };

  setOfflineSnapshot({ mode: resolveOnlineMode() });
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    attached = false;
  };
}
