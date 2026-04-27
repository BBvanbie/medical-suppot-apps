"use client";

import { OfflineProvider } from "@/components/offline/OfflineProvider";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { useEmsDisplayProfile } from "@/components/ems/useEmsDisplayProfile";
import { Sidebar } from "@/components/home/Sidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";
import { TriageModeBanner } from "@/components/shared/TriageModeBanner";
import { TrainingModeBanner } from "@/components/shared/TrainingModeBanner";
import type { AppMode } from "@/lib/appMode";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";

type EmsPortalShellProps = {
  children: React.ReactNode;
  operatorName: string;
  operatorCode: string;
  currentMode?: AppMode;
  operationalMode?: EmsOperationalMode;
};

export function EmsPortalShell({ children, operatorName, operatorCode, currentMode = "LIVE", operationalMode = "STANDARD" }: EmsPortalShellProps) {
  const displayProfile = useEmsDisplayProfile();

  return (
    <OfflineProvider>
      <PortalShellFrame
        shellClassName="ems-viewport-shell"
        mainClassName="ems-viewport-main ems-command-canvas"
        shellProps={{
          "data-ems-scale": displayProfile.scale,
          "data-ems-density": displayProfile.density,
          "data-ems-operation": operationalMode === "TRIAGE" ? "triage" : "standard",
        }}
        banner={
          <div className="flex w-full flex-col gap-3">
            <TrainingModeBanner mode={currentMode} />
            <TriageModeBanner operationalMode={operationalMode} />
            <div className="flex justify-end">
              <OfflineStatusBanner compact />
            </div>
          </div>
        }
        sidebar={({ isOpen, onToggle }) => (
          <Sidebar isOpen={isOpen} onToggle={onToggle} operatorName={operatorName} operatorCode={operatorCode} operationalMode={operationalMode} />
        )}
      >
        {children}
      </PortalShellFrame>
    </OfflineProvider>
  );
}
