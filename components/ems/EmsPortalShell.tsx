"use client";

import { OfflineProvider } from "@/components/offline/OfflineProvider";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { useEmsDisplayProfile } from "@/components/ems/useEmsDisplayProfile";
import { Sidebar } from "@/components/home/Sidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";
import { TrainingModeBanner } from "@/components/shared/TrainingModeBanner";
import type { AppMode } from "@/lib/appMode";

type EmsPortalShellProps = {
  children: React.ReactNode;
  operatorName: string;
  operatorCode: string;
  currentMode?: AppMode;
};

export function EmsPortalShell({ children, operatorName, operatorCode, currentMode = "LIVE" }: EmsPortalShellProps) {
  const displayProfile = useEmsDisplayProfile();

  return (
    <OfflineProvider>
      <PortalShellFrame
        shellClassName="ems-viewport-shell"
        mainClassName="ems-viewport-main bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)]"
        shellProps={{
          "data-ems-scale": displayProfile.scale,
          "data-ems-density": displayProfile.density,
        }}
        banner={
          <div className="flex w-full flex-col gap-3">
            <TrainingModeBanner mode={currentMode} />
            <div className="flex justify-end">
              <OfflineStatusBanner compact />
            </div>
          </div>
        }
        sidebar={({ isOpen, onToggle }) => (
          <Sidebar isOpen={isOpen} onToggle={onToggle} operatorName={operatorName} operatorCode={operatorCode} />
        )}
      >
        {children}
      </PortalShellFrame>
    </OfflineProvider>
  );
}
