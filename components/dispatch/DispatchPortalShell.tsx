"use client";

import { DispatchSidebar } from "@/components/dispatch/DispatchSidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";
import { TrainingModeBanner } from "@/components/shared/TrainingModeBanner";
import type { AppMode } from "@/lib/appMode";

type DispatchPortalShellProps = {
  children: React.ReactNode;
  operatorName: string;
  operatorCode: string;
  currentMode?: AppMode;
};

export function DispatchPortalShell({
  children,
  operatorName,
  operatorCode,
  currentMode = "LIVE",
}: DispatchPortalShellProps) {
  return (
    <PortalShellFrame
      mainClassName="bg-slate-50"
      banner={<TrainingModeBanner mode={currentMode} />}
      sidebar={({ isOpen, onToggle }) => (
        <DispatchSidebar isOpen={isOpen} onToggle={onToggle} operatorName={operatorName} operatorCode={operatorCode} />
      )}
    >
      {children}
    </PortalShellFrame>
  );
}
