"use client";

import { useEffect, useMemo, useState } from "react";

import type { EmsDisplaySettings } from "@/lib/emsSettingsValidation";
import { resolveEmsTextScale, type EmsResolvedTextScale, type EmsViewport } from "@/lib/emsDisplayScale";

type EmsDisplayProfile = {
  scale: EmsResolvedTextScale;
  density: EmsDisplaySettings["density"];
  textSize: EmsDisplaySettings["textSize"];
  viewport: EmsViewport;
};

function readViewport(): EmsViewport {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useEmsDisplayProfile(): EmsDisplayProfile {
  const [viewport, setViewport] = useState<EmsViewport>(() => readViewport());
  const [settings, setSettings] = useState<EmsDisplaySettings>({ textSize: "standard", density: "standard" });

  useEffect(() => {
    const handleResize = () => setViewport(readViewport());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/settings/ambulance/display", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as EmsDisplaySettings;
        if (active) setSettings(data);
      } catch {
        // Keep defaults when settings are unavailable.
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      scale: resolveEmsTextScale(settings.textSize, viewport),
      density: settings.density,
      textSize: settings.textSize,
      viewport,
    }),
    [settings, viewport],
  );
}
